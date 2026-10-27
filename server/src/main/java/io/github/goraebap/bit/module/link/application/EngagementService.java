package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.file.AttachedFile;
import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.CommentRepository;
import io.github.goraebap.bit.module.link.domain.ReactionRepository;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.media.Schema;
import java.net.URI;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EngagementService {
    public static final Set<String> EMOJI = Set.of(
            "👍", "👎", "❤️", "🎉", "🚀", "👀", "✅", "🙏", "💡", "🔥", "😄", "🤔", "🙂", "😂", "🙌", "💯", "👋", "👌",
            "⚠️", "❌", "😢", "😮", "👏", "💪");
    private final TargetFacade targetFacade;
    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final FileFacade fileFacade;
    private final Clock clock;
    private final List<io.github.goraebap.bit.module.link.TargetBodySpi> bodyWriters;
    private final org.springframework.context.ApplicationEventPublisher events;

    @Schema(requiredProperties = {"emoji", "count", "mine", "userIds"})
    public record ReactionView(String emoji, int count, boolean mine, List<String> userIds) {
        public ReactionView {
            userIds = List.copyOf(userIds);
        }
    }

    private void access(CurrentUser actor, String workspace, String type, String id, boolean writing) {
        if ("comment".equals(type)) {
            var comment =
                    commentRepository.findById(workspace, id).orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::raise);
            if (comment.audit().deletedAt() != null) throw CommentErrorCode.COMMENT_NOT_FOUND.raise();
            targetFacade.requireAccess(actor, workspace, comment.targetType(), comment.targetId(), writing);
            if (writing && !comment.audit().createdBy().equals(actor.userId()))
                throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        } else {
            if (!Set.of("work_item", "document").contains(type)) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
            targetFacade.requireAccess(actor, workspace, TargetType.valueOf(type), id, writing);
        }
    }

    @Transactional(readOnly = true)
    public List<ReactionView> reactions(CurrentUser actor, String workspace, String type, String id) {
        access(actor, workspace, type, id, false);
        var grouped = new LinkedHashMap<String, List<String>>();
        for (var row : reactionRepository.list(workspace, type, id))
            grouped.computeIfAbsent(row.emoji(), ignored -> new java.util.ArrayList<>())
                    .add(row.userId());
        return grouped.entrySet().stream()
                .map(entry -> new ReactionView(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().contains(actor.userId()),
                        entry.getValue()))
                .toList();
    }

    @Transactional
    public void react(CurrentUser actor, String workspace, String type, String id, String emoji, boolean active) {
        // Comment reactions need the parent's write permission, not authorship of the comment.
        if ("comment".equals(type)) {
            var comment =
                    commentRepository.findById(workspace, id).orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::raise);
            if (comment.audit().deletedAt() != null) throw CommentErrorCode.COMMENT_NOT_FOUND.raise();
            targetFacade.requireAccess(actor, workspace, comment.targetType(), comment.targetId(), true);
        } else access(actor, workspace, type, id, true);
        if (!EMOJI.contains(emoji)) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        reactionRepository.set(workspace, type, id, emoji, actor.userId(), actor.agent(), clock.instant(), active);
    }

    @Transactional(readOnly = true)
    public List<AttachedFile> files(CurrentUser actor, String workspace, String type, String id) {
        access(actor, workspace, type, id, false);
        return fileFacade.attachmentsOf(FileOwner.of(type), List.of(id)).getOrDefault(id, List.of());
    }

    @Transactional
    public void attach(CurrentUser actor, String workspace, String type, String id, List<String> uploads) {
        access(actor, workspace, type, id, true);
        var files = fileFacade.attach(actor, uploads, FileOwner.of(type), id);
        if (!"comment".equals(type)) {
            var target = targetFacade.requireAccess(actor, workspace, TargetType.valueOf(type), id, true);
            bodyWriters.stream()
                    .filter(writer -> writer.type() == target.type())
                    .findFirst()
                    .orElseThrow(CommonErrorCode.COMMON_INVALID_REQUEST::raise)
                    .appendAttachments(actor, target, files);
        }
        changed(actor, workspace, type, id, "added");
    }

    @Transactional
    public void discard(CurrentUser actor, String workspace, String type, String id, String fileId) {
        access(actor, workspace, type, id, true);
        if (fileFacade.attachmentsOf(FileOwner.of(type), List.of(id)).getOrDefault(id, List.of()).stream()
                .noneMatch(file -> file.id().equals(fileId))) return;
        fileFacade.discard(FileOwner.of(type), id, List.of(fileId), actor);
        changed(actor, workspace, type, id, "removed");
    }

    private void changed(CurrentUser actor, String workspace, String type, String id, String action) {
        if ("comment".equals(type)) return;
        var target = targetFacade.requireAccess(actor, workspace, TargetType.valueOf(type), id, true);
        events.publishEvent(new io.github.goraebap.bit.module.link.TargetChangedEvent(
                workspace,
                target.projectId(),
                target.type(),
                id,
                "changed",
                target.version(),
                actor.userId(),
                actor.agent(),
                clock.instant(),
                List.of(new io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange(
                        "attachments", null, action))));
    }

    @Transactional(readOnly = true)
    public URI open(CurrentUser actor, String workspace, String type, String id, String fileId, boolean download) {
        access(actor, workspace, type, id, false);
        return fileFacade
                .openUrl(FileOwner.of(type), id, fileId, download)
                .orElseThrow(LinkErrorCode.LINK_TARGET_NOT_FOUND::raise);
    }
}
