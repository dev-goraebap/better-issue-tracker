package io.github.goraebap.bit.shared.web;

import io.swagger.v3.oas.annotations.Operation;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SystemController {
    private final DataSource dataSource;

    SystemController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Operation(summary = "Check the server and its database")
    @GetMapping(value = "/api/v1/health", produces = "application/json")
    SystemViews.Health health() {
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            return new SystemViews.Health("UP");
        } catch (SQLException exception) {
            throw new IllegalStateException("Database health check failed", exception);
        }
    }

    @Operation(summary = "Read available optional capabilities")
    @GetMapping(value = "/api/v1/capabilities", produces = "application/json")
    SystemViews.Capabilities capabilities() {
        return new SystemViews.Capabilities(false, false, true, false, false);
    }
}
