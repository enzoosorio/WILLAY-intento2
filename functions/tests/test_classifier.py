"""
Tests unitarios para classifier/rules.py
Cómo ejecutar:
    cd functions
    python -m pytest tests/ -v
    python -m pytest tests/ -v --cov=classifier --cov-report=term-missing
"""
import pytest
from classifier.rules import classify_text


# ─── P1 ───────────────────────────────────────────────────────────────────────

class TestP1:
    def test_arma(self):
        r = classify_text("hay un sujeto con arma en la esquina")
        assert r["priority"] == "P1"
        assert "arma" in r["reason"]
        assert r["confidence"] >= 0.9

    def test_pistola(self):
        r = classify_text("el ladrón mostró una pistola")
        assert r["priority"] == "P1"

    def test_disparo(self):
        r = classify_text("escuché un disparo en el parque")
        assert r["priority"] == "P1"

    def test_disparos_plural(self):
        r = classify_text("se escuchan disparos desde el callejón")
        assert r["priority"] == "P1"

    def test_balacera(self):
        r = classify_text("balacera cerca del paradero Huamantanga")
        assert r["priority"] == "P1"

    def test_secuestro(self):
        r = classify_text("están intentando un secuestro frente al mercado")
        assert r["priority"] == "P1"

    def test_nino(self):
        r = classify_text("vi a un niño solo llorando, nadie lo atiende")
        assert r["priority"] == "P1"

    def test_nina(self):
        r = classify_text("una niña está sola en la calle sin adultos")
        assert r["priority"] == "P1"

    def test_tildes_normalizadas_p1(self):
        r = classify_text("reporto desaparición, creo que es rapto")
        assert r["priority"] == "P1"


# ─── P2 ───────────────────────────────────────────────────────────────────────

class TestP2:
    def test_robo(self):
        r = classify_text("robo a mano en la tienda de la esquina")
        assert r["priority"] == "P2"

    def test_asalto(self):
        r = classify_text("asalto al paso frente al banco comunal")
        assert r["priority"] == "P2"

    def test_pelea(self):
        r = classify_text("hay una pelea violenta entre dos personas")
        assert r["priority"] == "P2"

    def test_agresion(self):
        r = classify_text("agresión física en el paradero")
        assert r["priority"] == "P2"

    def test_sangre(self):
        r = classify_text("hay una persona con sangre en la cara")
        assert r["priority"] == "P2"

    def test_tildes_normalizadas_p2(self):
        r = classify_text("violenta agresión a una señora mayor")
        assert r["priority"] == "P2"


# ─── P3 ───────────────────────────────────────────────────────────────────────

class TestP3:
    def test_sospechoso(self):
        r = classify_text("hay un sospechoso mirando las casas desde hace rato")
        assert r["priority"] == "P3"
        assert r["confidence"] >= 0.8

    def test_merodea(self):
        r = classify_text("alguien merodeando el parque desde hace horas")
        assert r["priority"] == "P3"

    def test_merodeando(self):
        r = classify_text("persona merodeando el estacionamiento")
        assert r["priority"] == "P3"


# ─── Escalado de prioridad ────────────────────────────────────────────────────

class TestPriorityEscalation:
    def test_robo_con_arma_escala_a_p1(self):
        r = classify_text("hay un robo y el ladrón tiene un arma")
        assert r["priority"] == "P1"

    def test_sospechoso_con_cuchillo_escala_a_p1(self):
        r = classify_text("un sospechoso con cuchillo en la mano")
        assert r["priority"] == "P1"


# ─── Casos borde ──────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_texto_vacio(self):
        r = classify_text("")
        assert r["priority"] == "P3"
        assert r["reason"] == "rules:low_signal"

    def test_texto_muy_corto(self):
        r = classify_text("ok")
        assert r["priority"] == "P3"
        assert r["reason"] == "rules:low_signal"

    def test_texto_sin_keywords(self):
        r = classify_text("hay un vehículo mal estacionado en la avenida principal")
        assert r["confidence"] < 0.8  # debe escalar a Gemini

    def test_no_falso_positivo_farmacia(self):
        # "arma" no debe aparecer en "farmacia"
        r = classify_text("hay una farmacia cerrada en la esquina")
        assert r["priority"] != "P1"

    def test_confianza_baja_va_a_gemini_flag(self):
        r = classify_text("algo raro está pasando por aquí, no sé qué es")
        assert r["confidence"] < 0.8
        assert r["used_gemini"] is False  # aún no llamó a Gemini

    def test_used_gemini_siempre_false(self):
        # rules.py nunca llama a Gemini; eso es responsabilidad del caller
        for text in ["arma", "robo", "sospechoso", "nada relevante"]:
            assert classify_text(text)["used_gemini"] is False
