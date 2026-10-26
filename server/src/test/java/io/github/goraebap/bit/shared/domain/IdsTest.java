package io.github.goraebap.bit.shared.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashSet;
import org.junit.jupiter.api.Test;

class IdsTest {
    @Test
    void newIdsAreTenCharactersStartingWithALetterAndDoNotRepeat() {
        var seen = new HashSet<String>();
        for (int i = 0; i < 10_000; i++) {
            String id = Ids.newId();
            assertThat(id).matches(Ids.PATTERN);
            assertThat(Ids.isId(id)).isTrue();
            seen.add(id);
        }
        assertThat(seen).hasSize(10_000);
    }

    @Test
    void parseRefusesWhatIsNotAnId() {
        assertThat(Ids.parse("aB3dE6gH9j")).isEqualTo("aB3dE6gH9j");
        for (String raw : new String[] {
            null, "", "0123456789", "aB3dE6gH9", "aB3dE6gH9jk", "aB3dE6gH9-", "8b1c0f2b-974a-4f2b-9c3d-2a1b3c4d5e6f"
        }) {
            assertThat(Ids.isId(raw)).as(raw).isFalse();
            assertThatThrownBy(() -> Ids.parse(raw)).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
