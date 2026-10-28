package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.link.SubtaskRuleSpi;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.module.workitem.domain.WorkItemType;
import io.github.goraebap.bit.module.workitem.domain.WorkItemTypeRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceCreatedEvent;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * A workspace's work item types and the parent rules they set (D-104). Reading them is for every member; changing them
 * is a workspace setting. The rule checks here are the ones every path takes: making and changing work items, and the
 * link module adding or removing a subtask_of link (as its SubtaskRuleSpi). It never injects LinkFacade, since
 * LinkService calls it.
 */
@Service
@RequiredArgsConstructor
public class WorkItemTypeService implements SubtaskRuleSpi {
    private static final int SHOWN = 5;
    private final WorkItemTypeRepository workItemTypeRepository;
    private final WorkItemRepository workItemRepository;
    private final WorkspaceFacade workspaceFacade;
    private final Clock clock;

    @Transactional(readOnly = true)
    public void requireAccess(CurrentUser actor, String workspaceId, String typeId, boolean writing) {
        workspaceFacade.requireAccess(
                actor, workspaceId, writing ? WorkspaceFacade.Action.EDIT_SETTINGS : WorkspaceFacade.Action.READ);
        if (typeId != null) type(workspaceId, typeId);
    }

    @Transactional(readOnly = true)
    public List<WorkItemTypeViews.Item> list(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        var counts = workItemTypeRepository.countWorkItemsByType(workspaceId);
        return types.stream().map(t -> view(t, types, counts)).toList();
    }

    @Transactional(readOnly = true)
    public WorkItemTypeViews.Item get(CurrentUser actor, String workspaceId, String typeId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var type = type(workspaceId, typeId);
        return view(
                type,
                workItemTypeRepository.findAllByWorkspaceId(workspaceId),
                Map.of(type.id(), workItemTypeRepository.countWorkItemsByTypeId(workspaceId, type.id())));
    }

    /** The workspace's live types in display order, for an agent choosing one by name. */
    @Transactional(readOnly = true)
    public List<WorkItemType> findAll(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return workItemTypeRepository.findAllByWorkspaceId(workspaceId);
    }

    /** Types by id, deleted ones included, since a work item shows the type it has. */
    @Transactional(readOnly = true)
    public Map<String, WorkItemType> findAllById(String workspaceId, Set<String> ids) {
        return workItemTypeRepository.findAllById(workspaceId, ids).stream()
                .collect(Collectors.toUnmodifiableMap(WorkItemType::id, Function.identity()));
    }

    @Transactional
    public String create(CurrentUser actor, String workspaceId, WorkItemTypeRequests.Create request) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        requireLive(types, request.parents(), null);
        var now = clock.instant();
        WorkItemType type;
        try {
            type = WorkItemType.create(
                    Ids.newId(),
                    workspaceId,
                    request.name(),
                    request.icon(),
                    request.color(),
                    types.stream().mapToInt(WorkItemType::position).max().orElse(-1) + 1,
                    request.required(),
                    request.parents(),
                    actor.userId(),
                    actor.agent(),
                    now);
        } catch (IllegalArgumentException invalid) {
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise();
        }
        if (workItemTypeRepository.existsByNameAndIdNot(workspaceId, type.name(), null))
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_NAME_CONFLICT.raise();
        var changed = new ArrayList<WorkItemType>();
        if (request.makesDefault()) changed.addAll(handDefault(types, type, actor));
        changed.add(type);
        workItemTypeRepository.saveAll(changed);
        return type.id();
    }

    @Transactional
    public void revise(CurrentUser actor, String workspaceId, String typeId, WorkItemTypeRequests.Update request) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        var type = types.stream()
                .filter(t -> t.id().equals(typeId))
                .findFirst()
                .orElseThrow(WorkItemTypeErrorCode.WORK_ITEM_TYPE_NOT_FOUND::raise);
        version(type, request.getExpectedVersion());
        if (request.hasName() && request.getName() == null
                || request.hasColor() && request.getColor() == null
                || request.hasParentRequired() && request.getParentRequired() == null
                || request.hasIsDefault() && request.getIsDefault() == null)
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String name = request.hasName() ? request.getName() : type.name();
        String icon = request.hasIcon() ? request.getIcon() : type.icon();
        String color = request.hasColor() ? request.getColor() : type.color();
        boolean required = request.hasParentRequired() ? request.getParentRequired() : type.parentRequired();
        Set<String> parents = request.hasAllowedParentTypeIds()
                ? Set.copyOf(Objects.requireNonNullElse(request.getAllowedParentTypeIds(), List.of()))
                : type.parentTypeIds();
        requireLive(types, parents, type.id());
        if (required && parents.isEmpty()) throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise();
        boolean makeDefault = request.hasIsDefault() && request.getIsDefault();
        if (request.hasIsDefault() && !request.getIsDefault() && type.isDefault())
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise(
                    "기본 유형은 해제할 수 없습니다. 다른 유형을 기본으로 정하면 이 유형은 기본이 아니게 됩니다");
        if (required && (type.isDefault() || makeDefault))
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise(
                    "기본 유형은 상위 없이 만들 수 있어야 해서 상위를 필수로 둘 수 없습니다. 다른 유형을 기본으로 먼저 정하세요");
        if (type.renames(name) && workItemTypeRepository.existsByNameAndIdNot(workspaceId, name, typeId))
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_NAME_CONFLICT.raise();
        if (type.changesRule(required, parents)) {
            long breaking = workItemTypeRepository.countWorkItemsBreaking(workspaceId, typeId, required, parents);
            if (breaking > 0)
                throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_CONFLICT.raise("'" + type.name() + "' 유형의 업무 "
                        + breaking + "개가 바뀐 규칙에 맞지 않습니다(" + (required ? "상위가 없거나 " : "")
                        + "허용하지 않는 유형이나 일정 아래에 있음). 상위가 될 수 있는 유형: " + names(types, parents)
                        + ". 그 업무들의 상위나 유형을 먼저 바꾸세요");
        }
        var now = clock.instant();
        var changed = new ArrayList<WorkItemType>();
        try {
            type.revise(name, icon, color, required, parents, actor.userId(), actor.agent(), now);
            if (makeDefault && !type.isDefault()) changed.addAll(handDefault(types, type, actor));
        } catch (IllegalArgumentException invalid) {
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise();
        }
        changed.add(type);
        workItemTypeRepository.saveAll(changed);
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String typeId, long expectedVersion) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        var type = types.stream()
                .filter(t -> t.id().equals(typeId))
                .findFirst()
                .orElseThrow(WorkItemTypeErrorCode.WORK_ITEM_TYPE_NOT_FOUND::raise);
        version(type, expectedVersion);
        if (type.isDefault())
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_IN_USE.raise(
                    "기본 유형 " + topic(type.name()) + " 지울 수 없습니다. 다른 유형을 기본으로 정한 뒤 지우세요");
        long used = workItemTypeRepository.countWorkItemsByTypeId(workspaceId, typeId);
        if (used > 0)
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_IN_USE.raise(
                    "'" + type.name() + "' 유형을 쓰는 업무가 " + used + "개 있어 지울 수 없습니다. 그 업무들의 유형을 먼저 바꾸세요");
        var now = clock.instant();
        var changed = new ArrayList<WorkItemType>();
        for (var other : types) {
            if (other == type || !other.parentTypeIds().contains(typeId)) continue;
            try {
                other.forgetParent(typeId, actor.userId(), actor.agent(), now);
            } catch (IllegalArgumentException empty) {
                throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_CONFLICT.raise("'" + other.name() + "' 유형은 상위가 필요한데 "
                        + "상위가 될 수 있는 유형이 '" + type.name() + "'뿐이라 지울 수 없습니다. '" + other.name()
                        + "'의 규칙을 먼저 바꾸세요");
            }
            changed.add(other);
        }
        type.delete(actor.userId(), actor.agent(), now);
        changed.add(type);
        workItemTypeRepository.saveAll(changed);
    }

    @Transactional
    public void reorder(CurrentUser actor, String workspaceId, WorkItemTypeRequests.Order request) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        var entries = request.types();
        if (entries.size() != types.size()
                || entries.stream()
                                .map(WorkItemTypeRequests.OrderItem::id)
                                .distinct()
                                .count()
                        != entries.size()) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        var expected = entries.stream()
                .collect(Collectors.toMap(
                        WorkItemTypeRequests.OrderItem::id, WorkItemTypeRequests.OrderItem::expectedVersion));
        for (var type : types) {
            if (!expected.containsKey(type.id())) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
            version(type, expected.get(type.id()));
        }
        workItemTypeRepository.reorder(
                workspaceId,
                entries.stream().map(WorkItemTypeRequests.OrderItem::id).toList(),
                actor.userId(),
                actor.agent(),
                clock.instant());
    }

    /** Seeds the default types in the workspace's own transaction, so a workspace never exists without them. */
    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void seed(WorkspaceCreatedEvent event) {
        var ids = new HashMap<String, String>();
        for (var seed : WorkItemType.SEEDS) ids.put(seed.name(), Ids.newId());
        var types = new ArrayList<WorkItemType>();
        for (int i = 0; i < WorkItemType.SEEDS.size(); i++) {
            var seed = WorkItemType.SEEDS.get(i);
            var type = WorkItemType.create(
                    ids.get(seed.name()),
                    event.workspaceId(),
                    seed.name(),
                    seed.icon(),
                    seed.color(),
                    i,
                    seed.parentRequired(),
                    seed.parents().stream().map(ids::get).collect(Collectors.toSet()),
                    event.actorId(),
                    event.actorAgent(),
                    event.occurredAt());
            type.makeDefault(seed.isDefault(), event.actorId(), event.actorAgent(), event.occurredAt());
            types.add(type);
        }
        workItemTypeRepository.saveAll(types);
    }

    // The rules every path takes (D-104).

    /** The live type a task is made with or changed to; null is the workspace's default. */
    @Transactional(readOnly = true)
    public WorkItemType resolve(String workspaceId, String typeId) {
        if (typeId == null)
            return workItemTypeRepository
                    .findDefault(workspaceId)
                    .orElseThrow(() -> new IllegalStateException("Workspace without a default work item type"));
        return workItemTypeRepository
                .findById(workspaceId, typeId)
                .orElseThrow(WorkItemTypeErrorCode.WORK_ITEM_TYPE_INVALID::raise);
    }

    /**
     * Refuses a task of the type under the parent (null: under none) its rule does not allow. {@code item} names the
     * work item in the message, null for one not made yet.
     */
    @Transactional(readOnly = true)
    public void requireParent(String workspaceId, WorkItemType type, WorkItem parent, String item) {
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        String allowed = names(types, type.parentTypeIds());
        String who = item == null ? "" : item + ": ";
        if (parent == null) {
            if (!type.parentRequired()) return;
            throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_REQUIRED.raise(
                    who + "'" + type.name()
                            + "' 유형은 상위 업무가 있어야 합니다. 상위가 될 수 있는 유형(" + allowed
                            + ")의 업무 아래에 두세요. 만들 때는 MCP create_subtask의 parent나 API의 parentId를, 있는 업무는 상위(parent·parentId)를 함께 주세요");
        }
        String parentRef = reference(workspaceId, parent);
        if (parent.kind() == WorkItem.Kind.event)
            throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_NOT_ALLOWED.raise(who + "일정(" + parentRef
                    + ")은 상위 업무가 될 수 없습니다. '" + type.name() + "'의 상위가 될 수 있는 유형: " + allowedOrNone(allowed));
        if (type.allowsParent(parent.typeId())) return;
        if (type.topLevel())
            throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_NOT_ALLOWED.raise(
                    who + topic(type.name()) + " 최상위 유형이라 다른 업무(" + parentRef + ") 아래에 둘 수 없습니다");
        throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_NOT_ALLOWED.raise(who + topic(type.name()) + " '"
                + nameOf(workspaceId, types, parent.typeId()) + "'(" + parentRef + ") 아래에 둘 수 없습니다. 상위가 될 수 있는 유형: "
                + allowed);
    }

    /**
     * Refuses a work item becoming a type (null: becoming an event) that its live typed children do not allow as
     * their parent. {@code item} names it in the message.
     */
    @Transactional(readOnly = true)
    public void requireChildren(String workspaceId, String item, WorkItemType next, Collection<WorkItem> children) {
        var typed = children.stream()
                .filter(c -> c.kind() == WorkItem.Kind.task && c.typeId() != null)
                .toList();
        if (typed.isEmpty()) return;
        var childTypes =
                findAllById(workspaceId, typed.stream().map(WorkItem::typeId).collect(Collectors.toSet()));
        var breaking = typed.stream()
                .filter(c -> next == null
                        || !childTypes.containsKey(c.typeId())
                        || !childTypes.get(c.typeId()).allowsParent(next.id()))
                .toList();
        if (breaking.isEmpty()) return;
        var refs = workItemRepository.findReferences(
                workspaceId, breaking.stream().map(WorkItem::id).collect(Collectors.toSet()));
        String shown = breaking.stream()
                .limit(SHOWN)
                .map(c -> refs.getOrDefault(c.id(), c.id()) + " "
                        + (childTypes.containsKey(c.typeId())
                                ? childTypes.get(c.typeId()).name()
                                : "?"))
                .collect(Collectors.joining(", "));
        String more = breaking.size() > SHOWN ? " 외 " + (breaking.size() - SHOWN) + "개" : "";
        if (next == null)
            throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_NOT_ALLOWED.raise(item + "에 유형이 있는 하위 업무 " + breaking.size()
                    + "개(" + shown + more + ")가 있어 일정으로 바꿀 수 없습니다. 일정은 상위 업무가 될 수 없으니 하위 업무를 먼저 다른 상위로 옮기세요");
        throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_NOT_ALLOWED.raise(item + "의 하위 업무 " + breaking.size() + "개("
                + shown + more + ")는 '" + next.name() + "' 아래에 둘 수 없습니다. 하위 업무의 유형이나 상위를 먼저 바꾸세요");
    }

    @Override
    @Transactional(readOnly = true)
    public void requireParentAllowed(String workspaceId, String childId, String parentId) {
        var items = workItemRepository.findAllById(workspaceId, Set.of(childId, parentId)).stream()
                .collect(Collectors.toMap(WorkItem::id, Function.identity()));
        var child = items.get(childId);
        var parent = items.get(parentId);
        // The link module has already found both; an event sits under anything, as before (D-104).
        if (child == null || parent == null || child.kind() != WorkItem.Kind.task) return;
        requireParent(workspaceId, typeOf(workspaceId, child), parent, reference(workspaceId, child));
    }

    @Override
    @Transactional(readOnly = true)
    public void requireParentOptional(String workspaceId, String childId) {
        var child = workItemRepository.findAllById(workspaceId, Set.of(childId)).stream()
                .findFirst()
                .orElse(null);
        if (child == null || child.kind() != WorkItem.Kind.task) return;
        var type = typeOf(workspaceId, child);
        if (!type.parentRequired()) return;
        var types = workItemTypeRepository.findAllByWorkspaceId(workspaceId);
        throw WorkItemTypeErrorCode.WORK_ITEM_PARENT_REQUIRED.raise(reference(workspaceId, child) + ": '" + type.name()
                + "' 유형은 상위 업무가 있어야 해서 상위 연결만 끊을 수 없습니다. 다른 상위(" + names(types, type.parentTypeIds())
                + ")로 옮기거나(update_work_item의 parent, API의 parentId) 상위가 필요 없는 유형으로 먼저 바꾸세요");
    }

    private WorkItemType typeOf(String workspaceId, WorkItem item) {
        var type = item.typeId() == null
                ? null
                : findAllById(workspaceId, Set.of(item.typeId())).get(item.typeId());
        return type != null ? type : resolve(workspaceId, null);
    }

    private String reference(String workspaceId, WorkItem item) {
        return workItemRepository.findReferences(workspaceId, Set.of(item.id())).getOrDefault(item.id(), item.id());
    }

    private String nameOf(String workspaceId, List<WorkItemType> live, String typeId) {
        return live.stream()
                .filter(t -> t.id().equals(typeId))
                .map(WorkItemType::name)
                .findFirst()
                .orElseGet(() -> typeId == null
                        ? "유형 없음"
                        : findAllById(workspaceId, Set.of(typeId)).values().stream()
                                .map(WorkItemType::name)
                                .findFirst()
                                .orElse("지워진 유형"));
    }

    /** A name quoted with the topic particle its last syllable takes: '스토리'는, '작업'은. */
    private static String topic(String name) {
        char last = name.isEmpty() ? ' ' : name.charAt(name.length() - 1);
        String particle = last >= '\uAC00' && last <= '\uD7A3' ? ((last - 0xAC00) % 28 == 0 ? "는" : "은") : "은(는)";
        return "'" + name + "'" + particle;
    }

    /** The given types' names in display order, joined; 없음 for none. */
    private static String names(List<WorkItemType> types, Set<String> ids) {
        String joined = types.stream()
                .filter(t -> ids.contains(t.id()))
                .map(WorkItemType::name)
                .collect(Collectors.joining(", "));
        return joined.isEmpty() ? "없음" : joined;
    }

    private static String allowedOrNone(String allowed) {
        return "없음".equals(allowed) ? "없음(최상위 유형)" : allowed;
    }

    /** Hands the default to {@code next}, the old default changed first so two never hold it at once. */
    private List<WorkItemType> handDefault(List<WorkItemType> types, WorkItemType next, CurrentUser actor) {
        if (next.parentRequired()) throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_RULE_INVALID.raise();
        var now = clock.instant();
        var changed = new ArrayList<WorkItemType>();
        for (var type : types)
            if (type.isDefault() && !type.id().equals(next.id())) {
                type.makeDefault(false, actor.userId(), actor.agent(), now);
                changed.add(type);
            }
        next.makeDefault(true, actor.userId(), actor.agent(), now);
        return changed;
    }

    /** Every allowed parent must be a live type of the workspace; the type itself may be one. */
    private static void requireLive(List<WorkItemType> types, Set<String> parents, String self) {
        var live = new HashSet<String>();
        for (var type : types) live.add(type.id());
        if (self != null) live.add(self);
        if (!live.containsAll(parents)) throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_INVALID.raise();
    }

    private WorkItemType type(String workspaceId, String typeId) {
        return workItemTypeRepository
                .findById(workspaceId, typeId)
                .orElseThrow(WorkItemTypeErrorCode.WORK_ITEM_TYPE_NOT_FOUND::raise);
    }

    private static void version(WorkItemType type, Long expected) {
        if (expected == null || type.version() != expected)
            throw WorkItemTypeErrorCode.WORK_ITEM_TYPE_VERSION_CONFLICT.raise();
    }

    private static WorkItemTypeViews.Item view(WorkItemType type, List<WorkItemType> live, Map<String, Long> counts) {
        var a = type.audit();
        return new WorkItemTypeViews.Item(
                type.id(),
                type.workspaceId(),
                type.name(),
                type.icon(),
                type.color(),
                type.position(),
                type.isDefault(),
                type.parentRequired(),
                live.stream()
                        .map(WorkItemType::id)
                        .filter(type.parentTypeIds()::contains)
                        .toList(),
                counts.getOrDefault(type.id(), 0L),
                type.version(),
                a.createdAt(),
                a.updatedAt());
    }
}
