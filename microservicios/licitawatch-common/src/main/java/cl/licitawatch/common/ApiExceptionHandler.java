package cl.licitawatch.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Todas las respuestas de error usan {"mensaje": "..."} (el front lo espera así). */
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> api(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("mensaje", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacion(MethodArgumentNotValidException e) {
        String m = e.getBindingResult().getFieldErrors().stream().findFirst()
                .map(f -> f.getField() + ": " + f.getDefaultMessage()).orElse("Datos inválidos");
        return ResponseEntity.badRequest().body(Map.of("mensaje", m));
    }

    /** Otra capa o microservicio no responde (p. ej. aún está iniciando). */
    @ExceptionHandler(org.springframework.web.client.ResourceAccessException.class)
    public ResponseEntity<Map<String, String>> noDisponible(org.springframework.web.client.ResourceAccessException e) {
        return ResponseEntity.status(503).body(Map.of("mensaje", "Servicio no disponible en este momento. Intenta de nuevo en unos segundos."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> otro(Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("mensaje", "Error interno del servidor"));
    }
}
