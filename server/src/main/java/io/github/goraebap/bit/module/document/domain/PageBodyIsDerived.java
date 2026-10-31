package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.error.DomainRuleViolation;

/** The one refusal every Markdown-only path ends in on a page: PATCH body, update_document, appended attachments. */
public final class PageBodyIsDerived extends DomainRuleViolation {
    private static final long serialVersionUID = 1L;

    public PageBodyIsDerived() {
        super("페이지의 본문은 새 버전으로만 바뀝니다. update_page로 올려 주세요");
    }
}
