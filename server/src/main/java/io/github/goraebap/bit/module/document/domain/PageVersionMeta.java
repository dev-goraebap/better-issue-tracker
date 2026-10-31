package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import java.util.Locale;

/** What the uploader says about a version: a one-line note and the commit it describes; each may be absent. */
public record PageVersionMeta(String note, String baseCommit) {
    public static final int NOTE_MAX = 200;

    public PageVersionMeta {
        note = note == null || note.isBlank() ? null : note.strip();
        if (note != null && (note.length() > NOTE_MAX || note.indexOf('\n') >= 0 || note.indexOf('\r') >= 0))
            throw new DomainRuleViolation("버전 메모는 " + NOTE_MAX + "자 이하의 한 줄로 써 주세요");
        baseCommit = baseCommit == null || baseCommit.isBlank()
                ? null
                : baseCommit.strip().toLowerCase(Locale.ROOT);
        if (baseCommit != null && !baseCommit.matches("[0-9a-f]{7,64}"))
            throw new DomainRuleViolation("기준 커밋은 7~64자의 16진 커밋 해시로 써 주세요");
    }
}
