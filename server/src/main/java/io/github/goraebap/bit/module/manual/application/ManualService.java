package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.manual.domain.Manual;
import io.github.goraebap.bit.module.manual.domain.ManualContent;
import io.github.goraebap.bit.module.manual.domain.ManualRepository;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.net.URI;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ManualService {
    private static final Pattern IMAGE = Pattern.compile("attachment:([A-Za-z][A-Za-z0-9]{9})");
    private final ManualRepository manualRepository;
    private final ManualQuery manualQuery;
    private final WorkspaceFacade workspaceFacade;
    private final ProjectFacade projectFacade;
    private final FileFacade fileFacade;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ManualViews.Listing list(CurrentUser actor, String workspaceId, String projectId, String cursor, int limit) {
        return search(
                actor,
                workspaceId,
                projectId,
                new ManualQuery.Search(null, null, null, "updated", false),
                cursor,
                limit);
    }

    @Transactional(readOnly = true)
    public ManualViews.Listing search(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            ManualQuery.Search search,
            String cursor,
            int limit) {
        access(actor, workspaceId, projectId, false);
        if (limit < 1 || limit > 100) throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        boolean editing = workspaceFacade.allows(actor, workspaceId, WorkspaceFacade.Action.WRITE_DOCUMENTS);
        var rows = manualQuery.list(workspaceId, projectId, search, cursor, limit + 1);
        String next = rows.size() > limit ? rows.get(limit - 1).id() : null;
        var items = rows.stream()
                .limit(limit)
                .map(row -> new ManualViews.Summary(
                        row.id(),
                        row.projectId(),
                        row.scopeName(),
                        row.title(),
                        row.description(),
                        row.icon(),
                        row.color(),
                        row.pageCount(),
                        row.version(),
                        row.createdAt(),
                        row.updatedAt(),
                        editing))
                .toList();
        return new ManualViews.Listing(items, next, editing, manualQuery.count(workspaceId, projectId, search));
    }

    @Transactional(readOnly = true)
    public ManualViews.Detail get(CurrentUser actor, String workspaceId, String id) {
        var manual = require(actor, workspaceId, id, false);
        var assets = new LinkedHashMap<String, String>();
        fileFacade
                .attachmentsOf(FileOwner.MANUAL, List.of(id))
                .getOrDefault(id, List.of())
                .forEach(file -> assets.put(
                        file.id(), "/api/v1/workspaces/" + workspaceId + "/manuals/" + id + "/assets/" + file.id()));
        return new ManualViews.Detail(
                id,
                manual.projectId(),
                manual.title(),
                manual.description(),
                manual.icon(),
                manual.color(),
                manual.content(),
                assets,
                manual.version(),
                manual.audit().createdAt(),
                manual.audit().updatedAt(),
                workspaceFacade.allows(actor, workspaceId, WorkspaceFacade.Action.WRITE_DOCUMENTS));
    }

    @Transactional
    public String save(CurrentUser actor, String workspaceId, ManualRequests.Save request, boolean creating) {
        access(actor, workspaceId, request.projectId(), true);
        Manual previous = creating ? null : require(actor, workspaceId, request.id(), true);
        if (creating && manualRepository.existsById(request.id())
                || !creating && (request.expectedVersion() == null || previous.version() != request.expectedVersion()))
            throw ManualErrorCode.MANUAL_VERSION_CONFLICT.raise();
        if (previous != null && !Objects.equals(previous.projectId(), request.projectId()))
            throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        var content = content(actor, workspaceId, request.content(), previous == null ? null : previous.content());
        var available =
                fileFacade
                        .attachmentsOf(FileOwner.MANUAL, List.of(request.id()))
                        .getOrDefault(request.id(), List.of())
                        .stream()
                        .map(file -> file.id())
                        .collect(Collectors.toSet());
        available.addAll(request.uploadIds());
        var referenced = new java.util.HashSet<String>();
        for (var page : content.pages()) {
            var matcher = IMAGE.matcher(page.body());
            while (matcher.find()) referenced.add(matcher.group(1));
        }
        if (!available.containsAll(referenced) || !referenced.containsAll(request.uploadIds()))
            throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        Manual manual;
        if (previous == null)
            manual = Manual.create(
                    request.id(),
                    workspaceId,
                    request.projectId(),
                    request.title(),
                    request.description(),
                    request.icon(),
                    request.color(),
                    content,
                    actor.userId(),
                    actor.agent(),
                    clock.instant());
        else {
            previous.revise(
                    request.title(),
                    request.description(),
                    request.icon(),
                    request.color(),
                    content,
                    actor.userId(),
                    actor.agent(),
                    clock.instant());
            manual = previous;
        }
        manualRepository.save(manual);
        var attached = fileFacade.attach(actor, request.uploadIds(), FileOwner.MANUAL, manual.id());
        if (attached.stream().anyMatch(file -> !file.image())) throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        var kept =
                fileFacade.attachmentsOf(FileOwner.MANUAL, List.of(manual.id())).getOrDefault(manual.id(), List.of());
        if (kept.stream()
                        .filter(file -> referenced.contains(file.id()))
                        .mapToLong(file -> file.size())
                        .sum()
                > 100L * 1024 * 1024) throw ManualErrorCode.MANUAL_ASSET_LIMIT.raise();
        fileFacade.discard(
                FileOwner.MANUAL,
                manual.id(),
                kept.stream()
                        .filter(file -> !referenced.contains(file.id()))
                        .map(file -> file.id())
                        .toList(),
                actor);
        return manual.id();
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String id, long version) {
        var manual = require(actor, workspaceId, id, true);
        if (manual.version() != version) throw ManualErrorCode.MANUAL_VERSION_CONFLICT.raise();
        manual.delete(actor.userId(), actor.agent(), clock.instant());
        manualRepository.save(manual);
        fileFacade.discardAll(FileOwner.MANUAL, id, actor);
    }

    @Transactional(readOnly = true)
    public URI asset(CurrentUser actor, String workspaceId, String id, String assetId) {
        require(actor, workspaceId, id, false);
        return fileFacade
                .openUrl(FileOwner.MANUAL, id, assetId, false)
                .orElseThrow(ManualErrorCode.MANUAL_NOT_FOUND::raise);
    }

    private ManualContent content(CurrentUser actor, String workspaceId, ManualContent supplied, ManualContent before) {
        ManualContent.of(supplied.sections(), supplied.pages(), supplied.comments());
        var previous = new HashMap<String, ManualContent.Comment>();
        if (before != null) before.comments().forEach(comment -> previous.put(comment.id(), comment));
        var names = workspaceFacade.memberNames(actor, workspaceId, Set.of(actor.userId()));
        var comments = new ArrayList<ManualContent.Comment>();
        for (var item : supplied.comments()) {
            var old = previous.remove(item.id());
            if (old != null) {
                if (!old.body().equals(item.body()) || !old.pageId().equals(item.pageId()))
                    throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
                comments.add(new ManualContent.Comment(
                        old.id(),
                        old.pageId(),
                        old.body(),
                        item.resolved(),
                        old.createdAt(),
                        old.authorId(),
                        old.authorName(),
                        old.agentName(),
                        old.resolved() == item.resolved() ? old.resolvedAt() : item.resolved() ? clock.instant() : null,
                        old.resolved() == item.resolved()
                                ? old.resolvedBy()
                                : item.resolved() ? actor.userId() : null));
            } else
                comments.add(new ManualContent.Comment(
                        item.id(),
                        item.pageId(),
                        item.body(),
                        false,
                        clock.instant(),
                        actor.userId(),
                        names.getOrDefault(actor.userId(), "멤버"),
                        actor.agent(),
                        null,
                        null));
        }
        if (!previous.isEmpty()) throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        Map<String, ManualContent.Page> oldPages = before == null
                ? Map.of()
                : before.pages().stream().collect(Collectors.toMap(ManualContent.Page::id, page -> page));
        var pages = supplied.pages().stream()
                .map(page -> {
                    var old = oldPages.get(page.id());
                    return new ManualContent.Page(
                            page.id(),
                            page.title(),
                            page.body(),
                            page.sectionId(),
                            old != null
                                            && old.title().equals(page.title())
                                            && old.body().equals(page.body())
                                            && old.sectionId().equals(page.sectionId())
                                    ? old.updatedAt()
                                    : clock.instant());
                })
                .toList();
        return ManualContent.of(supplied.sections(), pages, comments);
    }

    private Manual require(CurrentUser actor, String workspaceId, String id, boolean writing) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var manual = manualRepository.findById(workspaceId, id).orElseThrow(ManualErrorCode.MANUAL_NOT_FOUND::raise);
        access(actor, workspaceId, manual.projectId(), writing);
        return manual;
    }

    private void access(CurrentUser actor, String workspaceId, String projectId, boolean writing) {
        workspaceFacade.requireAccess(
                actor, workspaceId, writing ? WorkspaceFacade.Action.WRITE_DOCUMENTS : WorkspaceFacade.Action.READ);
        if (projectId != null) projectFacade.requireAccess(actor, workspaceId, projectId, false);
    }
}
