package io.github.goraebap.bit.module.coderef.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CodeLinkRepository {
    /** An issue's links, newest first. */
    List<CodeLink> findAllByIssueId(String issueId);

    /** The links of these issues of one kind, newest first. */
    List<CodeLink> findAllByIssueIdIn(Collection<String> issueIds, CodeLink.Kind kind);

    /** Every issue one repository thing is tied to. */
    List<CodeLink> findAllByExternalId(String integrationId, CodeLink.Kind kind, String externalId);

    Optional<CodeLink> find(String integrationId, CodeLink.Kind kind, String externalId, String issueId);

    /** The repository issue an issue is mirrored with, if any. */
    Optional<CodeLink> findMirror(String integrationId, String issueId);

    void saveAll(Collection<CodeLink> links);
}
