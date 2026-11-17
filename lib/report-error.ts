// Writes one JSON log line that Google Cloud Error Reporting picks up from Cloud Run logs (it groups by the stack trace).
export function reportError(service: "client" | "server", message: string, stack = "", where = "", userAgent = "") {
  // Error Reporting needs a stack trace in the message, or this @type marker.
  const trace = stack && stack.includes(message) ? stack : `${message}\n${stack || `    at ${where || "unknown"}`}`;
  console.error(JSON.stringify({
    severity: "ERROR",
    "@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
    message: trace.slice(0, 4000),
    serviceContext: { service: `roamly-${service}` },
    context: { reportLocation: { filePath: where.slice(0, 200) || "unknown", lineNumber: 0, functionName: service }, httpRequest: { userAgent: userAgent.slice(0, 300) } },
  }));
}
