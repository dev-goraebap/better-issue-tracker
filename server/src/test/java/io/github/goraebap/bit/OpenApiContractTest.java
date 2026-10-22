package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=authentication-test-secret-at-least-32-characters",
            "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,org.springframework.boot.jooq.autoconfigure.JooqAutoConfiguration,org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration,org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration"
        })
@AutoConfigureMockMvc
@Import(OpenApiContractTest.ExportSecurity.class)
class OpenApiContractTest {
    @MockitoBean
    private DataSource dataSource;

    @MockitoBean
    private io.github.goraebap.bit.module.iam.domain.IamRepository iamRepository;

    @MockitoBean
    private io.github.goraebap.bit.module.workspace.domain.WorkspaceRepository workspaceRepository;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exportsTheCurrentApiContract() throws Exception {
        String body = mockMvc.perform(get("/api/openapi"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        var mapper = JsonMapper.builder().build();
        var contract = mapper.readTree(body);
        assertThat(contract.path("paths").has("/api/v1/auth/sessions")).isTrue();
        assertThat(contract.path("paths").has("/api/v1/health")).isTrue();
        assertThat(contract.path("paths").has("/api/v1/capabilities")).isTrue();
        assertThat(contract.at("/components/schemas/WorkspaceInvitation/properties/id")
                        .isMissingNode())
                .isFalse();
        assertThat(contract.at("/components/schemas/WorkspaceInvitation/properties/status")
                        .isMissingNode())
                .isFalse();
        assertThat(contract.at("/components/schemas/Invites/properties/items/items/$ref")
                        .asText())
                .endsWith("/WorkspaceInvitation");
        Path output = Path.of("openapi.json");
        if (Boolean.getBoolean("exportOpenApi")) {
            Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(contract) + "\n");
        } else {
            assertThat(mapper.readTree(Files.readString(output))).isEqualTo(contract);
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ExportSecurity {
        @Bean
        @Order(0)
        SecurityFilterChain contractSecurity(HttpSecurity httpSecurity) throws Exception {
            // Contract export is available only inside this test context.
            return httpSecurity
                    .securityMatcher("/api/openapi/**")
                    .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                    .build();
        }
    }
}
