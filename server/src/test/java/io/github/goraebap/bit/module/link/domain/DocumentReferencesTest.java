package io.github.goraebap.bit.module.link.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class DocumentReferencesTest {
    @Test
    void tracksOnlyLocalInlineLinksOutsideCodeAndImages() {
        String path = "/workspaces/space00001/documents/design-doc0000001";
        assertThat(DocumentReferences.ids(
                        "[scheme relative](//bit.example" + path + ")", "space00001", Set.of("https://bit.example")))
                .isEmpty();
        assertThat(DocumentReferences.ids("```md\n[only fenced](" + path + ")\n```", "space00001", Set.of()))
                .isEmpty();
        String body = "[good](" + path + ") [same](https://bit.example" + path + ") [external](https://other.example"
                + path + ") ![image](" + path + ")\n`[code](" + path + ")`\n```md\n[fenced](" + path + ")\n```\n";
        assertThat(DocumentReferences.ids(body, "space00001", Set.of("https://bit.example")))
                .containsExactly("doc0000001");
        assertThat(DocumentReferences.ids(
                        "`[only code](" + path + ")`\n![image](" + path + ")\n[foreign](https://other.example" + path
                                + ")",
                        "space00001",
                        Set.of("https://bit.example")))
                .isEmpty();
        assertThat(DocumentReferences.ids("[elsewhere](" + path + ")", "other00001", Set.of()))
                .isEmpty();
    }
}
