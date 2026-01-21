/**
 * Template email professionali per Interview Portal
 * Design coerente con il frontend (colori, stile, branding)
 */

// Colori del design system
const colors = {
  primary: "#4f46e5",
  primaryDark: "#4338ca",
  accent: "#2563eb",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  bgLight: "#f8fafc",
  bgLighter: "#f1f5f9",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8"
};

// Base wrapper per tutte le email
function emailWrapper(content, accentColor = colors.primary) {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.bgLight}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bgLight};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;">
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, ${accentColor} 0%, ${colors.primaryDark} 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                Interview Portal
              </h1>
            </td>
          </tr>
          <!-- Contenuto -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.bgLighter}; padding: 24px 40px; border-top: 1px solid ${colors.border};">
              <p style="margin: 0; color: ${colors.textMuted}; font-size: 13px; text-align: center; line-height: 1.6;">
                Questa email &egrave; stata inviata automaticamente da Interview Portal.<br>
                Per assistenza, contatta l'amministratore del sistema.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Card per informazioni
function infoCard(title, items, iconColor = colors.primary) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${colors.border};">
        <span style="color: ${colors.textMuted}; font-size: 13px; display: block; margin-bottom: 2px;">${item.label}</span>
        <span style="color: ${colors.textPrimary}; font-size: 15px; font-weight: 500;">${item.value}</span>
      </td>
    </tr>
  `).join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bgLight}; border-radius: 12px; margin: 24px 0; overflow: hidden; border: 1px solid ${colors.border};">
      <tr>
        <td style="background: linear-gradient(135deg, ${iconColor}15 0%, ${iconColor}05 100%); padding: 16px 20px; border-bottom: 1px solid ${colors.border};">
          <h3 style="margin: 0; color: ${iconColor}; font-size: 16px; font-weight: 600;">${title}</h3>
        </td>
      </tr>
      ${itemsHtml}
    </table>
  `;
}

// Badge di stato
function statusBadge(text, type = "default") {
  const badgeColors = {
    success: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
    warning: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    danger: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    info: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    default: { bg: colors.bgLighter, text: colors.textSecondary, border: colors.border }
  };
  const style = badgeColors[type] || badgeColors.default;

  return `<span style="display: inline-block; padding: 6px 14px; background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; border-radius: 20px; font-size: 13px; font-weight: 600;">${text}</span>`;
}

// Bottone CTA
function ctaButton(text, url, color = colors.primary) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, ${color} 0%, ${colors.primaryDark} 100%); border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// =============================================
// TEMPLATE SPECIFICI
// =============================================

// Template: Promemoria Colloquio
export function interviewReminderTemplate(data) {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600;">
      Promemoria Colloquio
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6;">
      Ti ricordiamo che hai un colloquio programmato.
    </p>

    ${infoCard("Dettagli Colloquio", [
      { label: "Candidato", value: data.candidate_name || "{{candidate_name}}" },
      { label: "Data", value: data.date || "{{date}}" },
      { label: "Orario", value: data.time || "{{time}}" },
      { label: "Luogo", value: data.location || "{{location}}" }
    ], colors.primary)}

    <p style="margin: 24px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.primary);
}

// Template: Promemoria Riunione
export function meetingReminderTemplate(data) {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600;">
      Promemoria Riunione
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6;">
      Ti ricordiamo la riunione programmata.
    </p>

    ${infoCard("Dettagli Riunione", [
      { label: "Titolo", value: data.meeting_title || "{{meeting_title}}" },
      { label: "Sala", value: data.room_name || "{{room_name}}" },
      { label: "Data", value: data.date || "{{date}}" },
      { label: "Orario", value: `${data.start_time || "{{start_time}}"} - ${data.end_time || "{{end_time}}"}` },
      ...(data.description ? [{ label: "Note", value: data.description }] : [])
    ], colors.success)}

    <p style="margin: 24px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.success);
}

// Template: Promemoria Veicolo
export function vehicleReminderTemplate(data) {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600;">
      Promemoria Prenotazione Veicolo
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6;">
      Ti ricordiamo la prenotazione del veicolo.
    </p>

    ${infoCard("Dettagli Prenotazione", [
      { label: "Veicolo", value: `${data.brand || "{{brand}}"} ${data.model || "{{model}}"}` },
      { label: "Targa", value: data.plate || "{{plate}}" },
      { label: "Data", value: data.date || "{{date}}" },
      { label: "Orario", value: data.time || "{{time}}" },
      { label: "Destinazione", value: data.destination || "{{destination}}" }
    ], colors.warning)}

    <p style="margin: 24px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.warning);
}

// Template: Nuova Richiesta (per admin)
export function requestSubmittedTemplate(data) {
  const actionUrl = data.action_url || "{{action_url}}";
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Nuova Richiesta", "warning")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Nuova Richiesta di Prenotazione
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      <strong>${data.requester_name || "{{requester_name}}"}</strong> ha inviato una nuova richiesta.
    </p>

    ${infoCard("Dettagli Richiesta", [
      { label: "Tipo", value: data.request_type || "{{request_type}}" },
      { label: "Data richiesta", value: data.date || "{{date}}" },
      { label: "Orario", value: `${data.start_time || "{{start_time}}"} - ${data.end_time || "{{end_time}}"}` },
      { label: "Dettagli", value: data.details || "{{details}}" }
    ], colors.warning)}

    <div style="text-align: center;">
      ${ctaButton("Gestisci Richiesta", actionUrl, colors.warning)}
    </div>
  `;

  return emailWrapper(content, colors.warning);
}

// Template: Richiesta Approvata
export function requestApprovedTemplate(data) {
  const actionUrl = data.action_url || "{{action_url}}";
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Approvata", "success")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Richiesta Approvata!
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      La tua richiesta di prenotazione &egrave; stata approvata.
    </p>

    ${infoCard("Dettagli Prenotazione Confermata", [
      { label: "Tipo", value: data.request_type || "{{request_type}}" },
      { label: "Data", value: data.date || "{{date}}" },
      { label: "Orario", value: `${data.start_time || "{{start_time}}"} - ${data.end_time || "{{end_time}}"}` },
      { label: "Dettagli", value: data.details || "{{details}}" }
    ], colors.success)}

    <div style="text-align: center;">
      ${ctaButton("Visualizza Dettagli", actionUrl, colors.success)}
    </div>

    <p style="margin: 24px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.success);
}

// Template: Richiesta Rifiutata
export function requestRejectedTemplate(data) {
  const actionUrl = data.action_url || "{{action_url}}";
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Rifiutata", "danger")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Richiesta Rifiutata
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      Purtroppo la tua richiesta di prenotazione non &egrave; stata approvata.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 12px; margin: 24px 0; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; color: ${colors.danger}; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            Motivazione
          </p>
          <p style="margin: 0; color: ${colors.textPrimary}; font-size: 15px; line-height: 1.6;">
            ${data.rejection_reason || "{{rejection_reason}}"}
          </p>
        </td>
      </tr>
    </table>

    ${infoCard("Dettagli Richiesta", [
      { label: "Tipo", value: data.request_type || "{{request_type}}" },
      { label: "Data richiesta", value: data.date || "{{date}}" }
    ], colors.danger)}

    <div style="text-align: center;">
      ${ctaButton("Visualizza Dettagli", actionUrl, colors.primary)}
    </div>

    <p style="margin: 24px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Per ulteriori informazioni, contatta l'amministratore.<br><br>
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.danger);
}

// Template: Controproposta
export function requestCounterTemplate(data) {
  const actionUrl = data.action_url || "{{action_url}}";
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Controproposta", "info")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Controproposta Ricevuta
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      L'amministratore ha proposto una modifica alla tua richiesta.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td width="48%" style="vertical-align: top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bgLighter}; border-radius: 12px; border: 1px solid ${colors.border};">
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid ${colors.border};">
                <span style="color: ${colors.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">La tua richiesta</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0; color: ${colors.textPrimary}; font-size: 14px;">${data.original_details || "{{original_details}}"}</p>
              </td>
            </tr>
          </table>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align: top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 12px; border: 1px solid #bfdbfe;">
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #bfdbfe;">
                <span style="color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Controproposta</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0; color: ${colors.textPrimary}; font-size: 14px; font-weight: 500;">${data.counter_details || "{{counter_details}}"}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 12px; margin: 24px 0; border: 1px solid #fde68a;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; color: #92400e; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            Motivazione
          </p>
          <p style="margin: 0; color: ${colors.textPrimary}; font-size: 15px; line-height: 1.6;">
            ${data.counter_reason || "{{counter_reason}}"}
          </p>
        </td>
      </tr>
    </table>

    <div style="text-align: center;">
      ${ctaButton("Rispondi alla Controproposta", actionUrl, colors.accent)}
    </div>
  `;

  return emailWrapper(content, colors.accent);
}

// Template: Prenotazione Sala Esterna
export function externalRoomBookingTemplate(data) {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Confermata", "success")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Prenotazione Sala Confermata
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      Ti informiamo che &egrave; stata effettuata una prenotazione a tuo nome.
    </p>

    ${infoCard("Dettagli Riunione", [
      { label: "Titolo", value: data.title },
      { label: "Sala", value: data.room_name },
      { label: "Data", value: data.date },
      { label: "Orario", value: `${data.start_time} - ${data.end_time}` },
      ...(data.organizer ? [{ label: "Organizzatore", value: data.organizer }] : []),
      ...(data.description ? [{ label: "Note", value: data.description }] : [])
    ], colors.success)}

    <p style="margin: 24px 0 0 0; color: ${colors.textMuted}; font-size: 13px; text-align: center;">
      Questa prenotazione &egrave; stata effettuata dalla segreteria/amministrazione.
    </p>

    <p style="margin: 16px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.success);
}

// Template: Prenotazione Veicolo Esterna
export function externalVehicleBookingTemplate(data) {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${statusBadge("Confermata", "success")}
    </div>

    <h2 style="margin: 0 0 8px 0; color: ${colors.textPrimary}; font-size: 22px; font-weight: 600; text-align: center;">
      Prenotazione Veicolo Confermata
    </h2>
    <p style="margin: 0 0 24px 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.6; text-align: center;">
      Ti informiamo che &egrave; stata effettuata una prenotazione veicolo a tuo nome.
    </p>

    ${infoCard("Dettagli Prenotazione", [
      { label: "Veicolo", value: `${data.brand} ${data.model}` },
      { label: "Targa", value: data.plate },
      { label: "Conducente", value: data.driver_name },
      { label: "Data partenza", value: data.start_date },
      { label: "Ora partenza", value: data.start_time },
      ...(data.end_date ? [{ label: "Rientro previsto", value: `${data.end_date} alle ${data.end_time}` }] : []),
      ...(data.destination ? [{ label: "Destinazione", value: data.destination }] : []),
      ...(data.purpose ? [{ label: "Motivo", value: data.purpose }] : []),
      ...(data.km_start ? [{ label: "Km alla partenza", value: `${data.km_start.toLocaleString()} km` }] : [])
    ], colors.warning)}

    <p style="margin: 24px 0 0 0; color: ${colors.textMuted}; font-size: 13px; text-align: center;">
      Questa prenotazione &egrave; stata effettuata dalla segreteria/amministrazione.
    </p>

    <p style="margin: 16px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">
      Cordiali saluti,<br>
      <strong style="color: ${colors.textPrimary};">Interview Portal</strong>
    </p>
  `;

  return emailWrapper(content, colors.warning);
}

// Export colors per uso esterno
export { colors, emailWrapper, infoCard, statusBadge, ctaButton };
