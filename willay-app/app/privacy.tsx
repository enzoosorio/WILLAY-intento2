import { ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/theme/colors";

export default function Privacy() {
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Política de privacidad — Willay (MVP)</Text>
        <Text style={styles.p}>
          Willay es un prototipo académico. Los datos que tratamos son los mínimos
          para que las funcionalidades demostrativas operen.
        </Text>

        <Text style={styles.h2}>Datos que tratamos</Text>
        <Text style={styles.p}>
          - Email y nombre de tu cuenta Google.{"\n"}
          - Zona del distrito que elegiste.{"\n"}
          - Ubicación GPS cuando enviás un reporte o una alerta de pánico.{"\n"}
          - Embeddings faciales (vectores numéricos derivados de fotos) cuando
          registrás una ficha o subís un avistamiento.
        </Text>

        <Text style={styles.h2}>Por qué los tratamos</Text>
        <Text style={styles.p}>
          Para procesar tu reporte, priorizar emergencias, alertar a tus vecinos
          cercanos y posibilitar el match facial en fichas de personas
          desaparecidas.
        </Text>

        <Text style={styles.h2}>Retención</Text>
        <Text style={styles.p}>
          - Avistamientos sin match facial: se borran a las 24h.{"\n"}
          - Fichas cerradas: el embedding se elimina; la ficha queda como
          histórico inactivo.{"\n"}
          - Tu cuenta: podés solicitar su borrado total escribiéndonos.
        </Text>

        <Text style={styles.h2}>Tus derechos</Text>
        <Text style={styles.p}>
          Acceso, rectificación, cancelación y oposición, conforme a la Ley
          29733. Podés retirar el consentimiento desactivando los permisos en
          Perfil → consentimientos.
        </Text>

        <Text style={styles.h2}>Limitaciones del MVP</Text>
        <Text style={styles.p}>
          Este es un proyecto académico. No implementa todas las medidas que
          requiere una operación real (DPIA, registro ante ANPDP, logs de
          auditoría inmutables). No utilizar para situaciones de riesgo real.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 10 },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  h2: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 14 },
  p: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
});
