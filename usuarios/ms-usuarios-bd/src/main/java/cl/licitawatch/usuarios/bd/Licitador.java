package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;

@Entity @Table(name = "licitador", uniqueConstraints = {
        @UniqueConstraint(name = "uq_licitador_usuario", columnNames = "usuario_id"), @UniqueConstraint(name = "uq_licitador_rut", columnNames = "rut")})
public class Licitador extends PerfilBase {}
