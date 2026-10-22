package io.github.goraebap.bit.shared.web;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ErrorReportValve;
import org.apache.coyote.ActionCode;
import org.springframework.http.HttpStatusCode;

/**
 * Tomcat's error report as a problem instead of its HTML page. It answers only what Tomcat refuses before the
 * application sees the request, such as an encoded slash or broken percent-encoding in the path; the application's
 * own errors already have a body when they get here.
 */
public class ProblemErrorReportValve extends ErrorReportValve {
    @Override
    protected void report(Request request, Response response, Throwable throwable) {
        int status = response.getStatus();
        if (status < 400 || response.getContentWritten() > 0 || !response.setErrorReported()) return;
        AtomicBoolean ioAllowed = new AtomicBoolean(false);
        response.getCoyoteResponse().action(ActionCode.IS_IO_ALLOWED, ioAllowed);
        if (!ioAllowed.get()) return;
        String body =
                ProblemResponse.prepare(response, status, ProblemResponse.commonCodeOf(HttpStatusCode.valueOf(status)));
        try {
            PrintWriter writer = response.getReporter();
            if (writer == null) return;
            writer.write(body);
            response.finishResponse();
        } catch (IOException | IllegalStateException e) {
            // The client went away or the response was already closed; there is no one left to tell.
            container.getLogger().debug("Problem report not written", e);
        }
    }
}
