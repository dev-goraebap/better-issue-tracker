package io.github.goraebap.bit.module.coderef.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ReferencesTest {
    @Test
    void readsIssueKeysFromBranchesCommitsAndTitlesInAnyCase() {
        assertThat(References.keys("bit-42-login-fix")).containsExactly("BIT-42");
        assertThat(References.keys("feature/BIT-7")).containsExactly("BIT-7");
        assertThat(References.keys("Fix BIT-3 and orm-14, again BIT-3")).containsExactly("BIT-3", "ORM-14");
        assertThat(References.keys("release-2026 v2-3x")).containsExactly("RELEASE-2026");
        assertThat(References.keys("BIT-0 or BIT-12a or 2BIT-5")).isEmpty();
        assertThat(References.keys(null)).isEmpty();
    }

    @Test
    void readsTheRepositorysOwnIssueNumbers() {
        assertThat(References.numbers("Closes #61, see #7 and owner/repo#9")).containsExactly("61", "7");
    }

    @Test
    void marksWhatBitWritesAndStripsItWhenItComesBack() {
        String body = "Login fails.\n\n---\n" + References.mark("issue", "abc") + "\nBIT [BIT-1](https://bit/x)";
        assertThat(References.fromBit(body)).isTrue();
        assertThat(References.withoutMarks(body)).isEqualTo("Login fails.");
        assertThat(References.withoutMarks("plain")).isEqualTo("plain");
        assertThat(References.fromBit("plain")).isFalse();
    }
}
