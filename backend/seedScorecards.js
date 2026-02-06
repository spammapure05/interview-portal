// Seed script per inserire i template scorecard per azienda di spedizioni marittime
import db from "./db.js";

const templates = [
  {
    name: "Operativo Export",
    department: "operations",
    description: "Valutazione per ruoli operativi export marittimo",
    categories: [
      {
        name: "Competenze Tecniche Settore",
        weight: 0.5,
        criteria: [
          { name: "Conoscenza Incoterms", description: "FOB, CIF, EXW, DDP, DAP, etc.", description_low: "Nessuna conoscenza", description_high: "Padronanza completa, sa consigliare" },
          { name: "Documentazione Export", description: "B/L, CMR, Packing List, Commercial Invoice", description_low: "Mai gestiti", description_high: "Gestisce autonomamente" },
          { name: "Pratiche Doganali Export", description: "DAE, T1, carnet ATA", description_low: "Nessuna esperienza", description_high: "Gestisce in autonomia" },
          { name: "Conoscenza Porti e Rotte", description: "Transit time, hub principali, carrier", description_low: "Conoscenza base", description_high: "Conosce dettagli e alternative" },
          { name: "Gestione Container", description: "FCL/LCL, groupage, booking", description_low: "Solo teoria", description_high: "Esperienza pratica booking e tracking" },
          { name: "Merci Pericolose/Speciali", description: "IMO, ADR, temperatura controllata", description_low: "Nessuna esperienza", description_high: "Gestisce certificazioni e procedure" }
        ]
      },
      {
        name: "Strumenti e Software",
        weight: 0.2,
        criteria: [
          { name: "Gestionali Spedizioni", description: "Sinfomar, Cargo360, o simili", description_low: "Mai usati", description_high: "Utilizzo avanzato" },
          { name: "Portali Armatori", description: "Maersk, MSC, Hapag-Lloyd, CMA CGM", description_low: "Mai usati", description_high: "Utilizzo quotidiano" },
          { name: "Excel", description: "CERCA.VERT, pivot, formule", description_low: "Uso base", description_high: "Crea report complessi" }
        ]
      },
      {
        name: "Lingue",
        weight: 0.15,
        criteria: [
          { name: "Inglese", description: "Scritto e parlato tecnico", description_low: "A1-A2 base", description_high: "C1/C2 fluente tecnico" },
          { name: "Altre Lingue", description: "Francese, Spagnolo, Tedesco, etc.", description_low: "Nessuna", description_high: "Fluente in 2+ lingue" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.15,
        criteria: [
          { name: "Gestione Stress", description: "Deadline strette, urgenze", description_low: "Si blocca sotto pressione", description_high: "Mantiene lucidità e priorità" },
          { name: "Precisione", description: "Attenzione al dettaglio documentale", description_low: "Commette errori frequenti", description_high: "Zero errori, doppio controllo" },
          { name: "Problem Solving", description: "Ritardi, blocchi dogana, urgenze", description_low: "Cerca sempre aiuto", description_high: "Trova soluzioni autonomamente" },
          { name: "Comunicazione", description: "Clienti, agenti, vettori", description_low: "Comunicazione confusa", description_high: "Chiaro, professionale, proattivo" }
        ]
      }
    ],
    questions: [
      { question: "Descrivi il flusso di una spedizione FCL export dall'ordine alla partenza nave", category: "technical" },
      { question: "Qual è la differenza tra B/L Master e House? Quando usi l'uno o l'altro?", category: "technical" },
      { question: "Come gestisci una situazione di overbooking del carrier?", category: "situational" },
      { question: "Un cliente chiede spedizione DDP in USA: quali costi devi considerare?", category: "technical" },
      { question: "La nave ritarda 5 giorni: come comunichi al cliente e cosa proponi?", category: "situational" },
      { question: "Quali documenti servono per esportare merce dual-use?", category: "technical" }
    ]
  },
  {
    name: "Operativo Import",
    department: "operations",
    description: "Valutazione per ruoli operativi import marittimo",
    categories: [
      {
        name: "Competenze Tecniche Settore",
        weight: 0.5,
        criteria: [
          { name: "Conoscenza Incoterms", description: "FOB, CIF, EXW, DDP, DAP per import", description_low: "Nessuna conoscenza", description_high: "Padronanza completa" },
          { name: "Documentazione Import", description: "B/L, AWB, documenti origine, fitosanitari", description_low: "Mai gestiti", description_high: "Gestisce autonomamente" },
          { name: "Sdoganamento Import", description: "Procedure doganali, controlli, verifiche", description_low: "Nessuna esperienza", description_high: "Gestisce in autonomia" },
          { name: "Gestione Container Import", description: "Sbarco, demurrage, detention, riconsegna", description_low: "Solo teoria", description_high: "Ottimizza costi e tempi" },
          { name: "Normative Import", description: "Restrizioni, quote, certificazioni", description_low: "Conoscenza base", description_high: "Aggiornato su tutte le normative" }
        ]
      },
      {
        name: "Strumenti e Software",
        weight: 0.2,
        criteria: [
          { name: "Gestionali Spedizioni", description: "Sinfomar, Cargo360, o simili", description_low: "Mai usati", description_high: "Utilizzo avanzato" },
          { name: "Portali Dogana", description: "AIDA, NCTS, sistemi doganali", description_low: "Mai usati", description_high: "Utilizzo quotidiano" },
          { name: "Excel e Reporting", description: "Analisi costi, tracciamento", description_low: "Uso base", description_high: "Report automatizzati" }
        ]
      },
      {
        name: "Lingue",
        weight: 0.15,
        criteria: [
          { name: "Inglese", description: "Comunicazione con fornitori esteri", description_low: "A1-A2 base", description_high: "C1/C2 fluente" },
          { name: "Cinese/Altre Lingue", description: "Per mercati specifici", description_low: "Nessuna", description_high: "Fluente" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.15,
        criteria: [
          { name: "Gestione Priorità", description: "Multiple spedizioni contemporanee", description_low: "Si perde", description_high: "Organizzato e metodico" },
          { name: "Precisione Documentale", description: "Controllo documenti import", description_low: "Errori frequenti", description_high: "Zero discrepanze" },
          { name: "Negoziazione", description: "Con dogana, terminal, trasportatori", description_low: "Accetta tutto", description_high: "Ottiene condizioni migliori" },
          { name: "Proattività", description: "Anticipa problemi, informa cliente", description_low: "Aspetta istruzioni", description_high: "Comunica proattivamente" }
        ]
      }
    ],
    questions: [
      { question: "Descrivi il processo di sdoganamento di un container FCL import dalla Cina", category: "technical" },
      { question: "Come calcoli demurrage e detention? Come li minimizzi?", category: "technical" },
      { question: "Container arriva con danni: qual è la procedura?", category: "situational" },
      { question: "Merce bloccata in dogana per controllo: come gestisci il cliente?", category: "situational" }
    ]
  },
  {
    name: "Doganalista",
    department: "customs",
    description: "Valutazione per specialisti doganali",
    categories: [
      {
        name: "Normativa Doganale",
        weight: 0.4,
        criteria: [
          { name: "Codice Doganale UE", description: "CDU, regolamenti applicativi", description_low: "Conoscenza superficiale", description_high: "Padronanza completa, casi complessi" },
          { name: "Regimi Doganali", description: "42, 45, temporanea, perfezionamento", description_low: "Conosce solo i base", description_high: "Gestisce tutti i regimi" },
          { name: "Origine Preferenziale", description: "EUR1, ATR, Form A, cumulo", description_low: "Concetti base", description_high: "Verifica e certifica autonomamente" },
          { name: "Export Control", description: "Dual Use, sanzioni, embargo", description_low: "Nessuna esperienza", description_high: "Gestisce screening e licenze" },
          { name: "IVA e Accise", description: "Plafond, rappresentante fiscale", description_low: "Concetti base", description_high: "Ottimizzazione fiscale" }
        ]
      },
      {
        name: "Classificazione Merci",
        weight: 0.25,
        criteria: [
          { name: "Nomenclatura Combinata", description: "Codici NC, TARIC", description_low: "Usa solo motori ricerca", description_high: "Classifica autonomamente" },
          { name: "ITV", description: "Informazioni Tariffarie Vincolanti", description_low: "Mai richieste", description_high: "Ha ottenuto ITV" },
          { name: "Dazi e Misure", description: "Antidumping, contingenti, preferenze", description_low: "Conoscenza base", description_high: "Ottimizza pagamento dazi" }
        ]
      },
      {
        name: "Strumenti",
        weight: 0.15,
        criteria: [
          { name: "AIDA", description: "Agenzia Dogane, telematizzazione", description_low: "Mai usato", description_high: "Utilizzo quotidiano avanzato" },
          { name: "Portali Export Control", description: "TARIC, DUE", description_low: "Mai usati", description_high: "Screening autonomo" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.2,
        criteria: [
          { name: "Precisione Assoluta", description: "Errori doganali = sanzioni", description_low: "Commette errori", description_high: "Zero errori, verifica tripla" },
          { name: "Aggiornamento Continuo", description: "Normativa in evoluzione", description_low: "Non si aggiorna", description_high: "Segue tutte le novità" },
          { name: "Relazione con Enti", description: "Dogana, Guardia di Finanza", description_low: "Evita contatti", description_high: "Rapporti costruttivi" }
        ]
      }
    ],
    questions: [
      { question: "Spiega il regime doganale 42 e quando lo applichi", category: "technical" },
      { question: "Come verifichi l'origine preferenziale di una merce?", category: "technical" },
      { question: "Merce bloccata per controllo documentale: come procedi?", category: "situational" },
      { question: "Differenza tra ITV e classificazione autonoma?", category: "technical" },
      { question: "Cliente vuole esportare in Iran: cosa verifichi?", category: "situational" }
    ]
  },
  {
    name: "Inside Sales",
    department: "commercial",
    description: "Valutazione per ruoli commerciali interni",
    categories: [
      {
        name: "Competenze Commerciali",
        weight: 0.35,
        criteria: [
          { name: "Tecniche di Vendita", description: "Prospezione, qualifica, closing", description_low: "Nessuna esperienza", description_high: "Chiude autonomamente" },
          { name: "Gestione Obiezioni", description: "Prezzo, tempi, competitor", description_low: "Si blocca", description_high: "Trasforma in opportunità" },
          { name: "Upselling/Cross-selling", description: "Servizi aggiuntivi, assicurazione", description_low: "Non propone", description_high: "Aumenta valore ordine" },
          { name: "Preventivazione", description: "Quotazioni accurate e competitive", description_low: "Errori frequenti", description_high: "Veloce e preciso" }
        ]
      },
      {
        name: "Conoscenza Settore",
        weight: 0.25,
        criteria: [
          { name: "Servizi Marittimi", description: "FCL, LCL, groupage, special", description_low: "Conoscenza base", description_high: "Conosce tutte le opzioni" },
          { name: "Tariffe e Costi", description: "Noli, surcharge, costi accessori", description_low: "Non conosce struttura", description_high: "Calcola margini" },
          { name: "Concorrenza", description: "Posizionamento, punti di forza", description_low: "Non conosce mercato", description_high: "Analisi competitiva" }
        ]
      },
      {
        name: "Strumenti",
        weight: 0.15,
        criteria: [
          { name: "CRM", description: "Gestione lead, pipeline, follow-up", description_low: "Mai usato", description_high: "Utilizzo avanzato" },
          { name: "Office/Preventivi", description: "Excel, Word, presentazioni", description_low: "Uso base", description_high: "Documenti professionali" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.25,
        criteria: [
          { name: "Comunicazione", description: "Telefono, email, video", description_low: "Poco efficace", description_high: "Persuasivo e chiaro" },
          { name: "Orientamento Obiettivi", description: "Target, KPI, risultati", description_low: "Non raggiunge target", description_high: "Supera costantemente" },
          { name: "Resilienza", description: "Gestione rifiuti, persistenza", description_low: "Si scoraggia", description_high: "Persevera con metodo" },
          { name: "Organizzazione", description: "Gestione tempo, priorità", description_low: "Disorganizzato", description_high: "Pipeline sempre aggiornata" }
        ]
      }
    ],
    questions: [
      { question: "Come qualifichi un nuovo lead nel settore spedizioni?", category: "behavioral" },
      { question: "Cliente chiede sconto 20% su FCL Cina: come rispondi?", category: "situational" },
      { question: "Come presenti il valore aggiunto rispetto a un competitor più economico?", category: "behavioral" },
      { question: "Racconta una trattativa complessa che hai chiuso", category: "behavioral" },
      { question: "Come costruisci una relazione a lungo termine con un cliente?", category: "behavioral" }
    ]
  },
  {
    name: "Customer Service",
    department: "customer_service",
    description: "Valutazione per ruoli di assistenza clienti",
    categories: [
      {
        name: "Competenze Operative",
        weight: 0.35,
        criteria: [
          { name: "Tracking Spedizioni", description: "Monitoraggio, status update", description_low: "Non sa tracciare", description_high: "Anticipa problemi" },
          { name: "Gestione Anomalie", description: "Ritardi, danni, smarrimenti", description_low: "Non sa gestire", description_high: "Risolve autonomamente" },
          { name: "Conoscenza Base Settore", description: "Incoterms, documenti essenziali", description_low: "Nessuna", description_high: "Risponde a domande tecniche" },
          { name: "Procedure Reclamo", description: "Apertura pratica, follow-up", description_low: "Non conosce iter", description_high: "Gestisce fino a chiusura" }
        ]
      },
      {
        name: "Relazione Cliente",
        weight: 0.35,
        criteria: [
          { name: "Empatia", description: "Comprensione esigenze cliente", description_low: "Freddo/distaccato", description_high: "Cliente si sente compreso" },
          { name: "Gestione Lamentele", description: "De-escalation, soluzione", description_low: "Peggiora situazione", description_high: "Trasforma in fidelizzazione" },
          { name: "Comunicazione Proattiva", description: "Aggiornamenti senza richiesta", description_low: "Solo se sollecitato", description_high: "Comunica prima che chiedano" },
          { name: "Professionalità", description: "Tono, linguaggio, cortesia", description_low: "Poco professionale", description_high: "Sempre impeccabile" }
        ]
      },
      {
        name: "Lingue",
        weight: 0.15,
        criteria: [
          { name: "Inglese", description: "Scritto e parlato fluente", description_low: "Base", description_high: "Madrelingua/C2" },
          { name: "Altre Lingue", description: "Per clientela internazionale", description_low: "Solo italiano", description_high: "3+ lingue" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.15,
        criteria: [
          { name: "Pazienza", description: "Con clienti difficili", description_low: "Perde la calma", description_high: "Sempre paziente" },
          { name: "Multitasking", description: "Gestione chiamate/email/chat", description_low: "Si perde", description_high: "Gestisce tutto fluentemente" },
          { name: "Problem Solving", description: "Trovare soluzioni rapide", description_low: "Aspetta istruzioni", description_high: "Autonomo e creativo" }
        ]
      }
    ],
    questions: [
      { question: "Cliente arrabbiato per ritardo: come gestisci la chiamata?", category: "situational" },
      { question: "Come comunichi proattivamente un problema sulla spedizione?", category: "behavioral" },
      { question: "Descrivi come traccia una spedizione e identifichi anomalie", category: "technical" },
      { question: "Cliente chiede rimborso non dovuto: come rispondi?", category: "situational" }
    ]
  },
  {
    name: "Back Office",
    department: "admin",
    description: "Valutazione per ruoli di back office documentale",
    categories: [
      {
        name: "Competenze Tecniche",
        weight: 0.4,
        criteria: [
          { name: "Gestione Documentale", description: "Archiviazione, organizzazione, ricerca", description_low: "Disorganizzato", description_high: "Sistema impeccabile" },
          { name: "Documentazione Spedizioni", description: "B/L, fatture, packing list", description_low: "Non conosce", description_high: "Verifica e corregge errori" },
          { name: "Data Entry", description: "Inserimento dati accurato e veloce", description_low: "Lento/errori", description_high: "Veloce e preciso" },
          { name: "Corrispondenza", description: "Email, lettere, comunicazioni", description_low: "Errori grammaticali", description_high: "Professionale e accurato" }
        ]
      },
      {
        name: "Strumenti",
        weight: 0.3,
        criteria: [
          { name: "Gestionali", description: "ERP, software spedizioni", description_low: "Mai usati", description_high: "Utilizzo avanzato" },
          { name: "Office Suite", description: "Word, Excel, Outlook", description_low: "Uso base", description_high: "Funzioni avanzate" },
          { name: "Archiviazione Digitale", description: "Scan, OCR, cloud", description_low: "Solo cartaceo", description_high: "Workflow digitale" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.3,
        criteria: [
          { name: "Precisione", description: "Attenzione ai dettagli", description_low: "Errori frequenti", description_high: "Zero errori" },
          { name: "Organizzazione", description: "Gestione priorità e scadenze", description_low: "Caotico", description_high: "Sempre in ordine" },
          { name: "Riservatezza", description: "Gestione dati sensibili", description_low: "Poco attento", description_high: "Massima discrezione" },
          { name: "Autonomia", description: "Lavoro indipendente", description_low: "Chiede sempre", description_high: "Completamente autonomo" }
        ]
      }
    ],
    questions: [
      { question: "Come organizzi l'archivio documentale di una spedizione?", category: "behavioral" },
      { question: "Trovi un errore in una fattura già inviata: cosa fai?", category: "situational" },
      { question: "Come gestisci picchi di lavoro con molte pratiche urgenti?", category: "behavioral" }
    ]
  },
  {
    name: "Fatturazione",
    department: "finance",
    description: "Valutazione per ruoli di fatturazione e contabilità spedizioni",
    categories: [
      {
        name: "Competenze Contabili",
        weight: 0.4,
        criteria: [
          { name: "Fatturazione Attiva", description: "Emissione fatture, note credito", description_low: "Non sa emettere", description_high: "Gestisce tutti i casi" },
          { name: "Fatturazione Passiva", description: "Registrazione, verifica, pagamenti", description_low: "Non sa registrare", description_high: "Riconciliazione completa" },
          { name: "Contabilità Generale", description: "Prima nota, partitario, scadenzario", description_low: "Concetti base", description_high: "Gestisce autonomamente" },
          { name: "IVA e Normativa Fiscale", description: "Aliquote, reverse charge, split payment", description_low: "Non conosce", description_high: "Applica correttamente" },
          { name: "Solleciti e Recupero Crediti", description: "Gestione insoluti, comunicazioni", description_low: "Non sa gestire", description_high: "Riduce DSO" }
        ]
      },
      {
        name: "Conoscenza Settore Spedizioni",
        weight: 0.25,
        criteria: [
          { name: "Tariffe e Noli", description: "Struttura costi marittimi", description_low: "Non conosce", description_high: "Verifica correttezza" },
          { name: "Surcharge e Accessori", description: "BAF, CAF, THC, demurrage", description_low: "Non sa cosa sono", description_high: "Controlla e contesta" },
          { name: "Rifatturazione", description: "A clienti per servizi terzi", description_low: "Non sa fare", description_high: "Gestisce mark-up" },
          { name: "Incoterms e Costi", description: "Chi paga cosa per Incoterm", description_low: "Non conosce", description_high: "Alloca correttamente" }
        ]
      },
      {
        name: "Strumenti",
        weight: 0.2,
        criteria: [
          { name: "Software Contabilità", description: "Zucchetti, TeamSystem, SAP", description_low: "Mai usati", description_high: "Utilizzo avanzato" },
          { name: "Excel Avanzato", description: "Pivot, formule, riconciliazioni", description_low: "Uso base", description_high: "Automazioni complesse" },
          { name: "Fatturazione Elettronica", description: "SDI, XML, conservazione", description_low: "Non conosce", description_high: "Gestisce anomalie" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.15,
        criteria: [
          { name: "Precisione Numerica", description: "Zero errori nei calcoli", description_low: "Errori frequenti", description_high: "Precisione assoluta" },
          { name: "Rispetto Scadenze", description: "Chiusure mensili, pagamenti", description_low: "Ritardi", description_high: "Sempre puntuale" },
          { name: "Comunicazione Interna", description: "Con operativi per chiarimenti", description_low: "Non comunica", description_high: "Collaborativo" },
          { name: "Problem Solving", description: "Discrepanze, contestazioni", description_low: "Non sa risolvere", description_high: "Trova sempre soluzione" }
        ]
      }
    ],
    questions: [
      { question: "Come verifichi la correttezza di una fattura fornitore marittimo?", category: "technical" },
      { question: "Cliente contesta addebito demurrage: come gestisci?", category: "situational" },
      { question: "Descrivi il processo di chiusura mensile che seguivi", category: "behavioral" },
      { question: "Come gestisci un insoluto importante? Quali step?", category: "behavioral" },
      { question: "Errore in fattura già inviata a SDI: cosa fai?", category: "situational" }
    ]
  },
  {
    name: "Magazziniere",
    department: "warehouse",
    description: "Valutazione per ruoli di magazzino e logistica",
    categories: [
      {
        name: "Competenze Operative",
        weight: 0.45,
        criteria: [
          { name: "Movimentazione Merci", description: "Carico, scarico, stoccaggio", description_low: "Nessuna esperienza", description_high: "Gestisce tutti i tipi merce" },
          { name: "Uso Carrelli Elevatori", description: "Muletto frontale, retrattile, transpallet", description_low: "Non patentato", description_high: "Patentato, esperienza pluriennale" },
          { name: "Inventario e Giacenze", description: "Conta, verifica, reporting", description_low: "Non sa fare inventario", description_high: "Gestisce autonomamente" },
          { name: "Controllo Qualità Merce", description: "Verifica danni, quantità, conformità", description_low: "Non controlla", description_high: "Rileva ogni anomalia" },
          { name: "Picking e Preparazione", description: "Ordini, spedizioni, packing", description_low: "Lento/errori", description_high: "Veloce e preciso" }
        ]
      },
      {
        name: "Sicurezza",
        weight: 0.25,
        criteria: [
          { name: "Normative Sicurezza", description: "D.Lgs 81/08, DPI, procedure", description_low: "Non conosce", description_high: "Applica sempre" },
          { name: "Gestione Merci Pericolose", description: "ADR, IMO, etichettatura", description_low: "Nessuna esperienza", description_high: "Certificato e esperto" },
          { name: "Ordine e Pulizia", description: "5S, organizzazione spazi", description_low: "Disordinato", description_high: "Magazzino impeccabile" }
        ]
      },
      {
        name: "Strumenti",
        weight: 0.15,
        criteria: [
          { name: "WMS", description: "Software gestione magazzino", description_low: "Mai usato", description_high: "Utilizzo avanzato" },
          { name: "Palmari/Scanner", description: "Barcode, RFID", description_low: "Mai usati", description_high: "Utilizzo quotidiano" }
        ]
      },
      {
        name: "Soft Skills",
        weight: 0.15,
        criteria: [
          { name: "Affidabilità", description: "Puntualità, presenza, impegno", description_low: "Poco affidabile", description_high: "Sempre presente e puntuale" },
          { name: "Lavoro di Squadra", description: "Collaborazione con colleghi", description_low: "Individualista", description_high: "Team player" },
          { name: "Resistenza Fisica", description: "Lavoro manuale prolungato", description_low: "Si stanca facilmente", description_high: "Ottima forma fisica" }
        ]
      }
    ],
    questions: [
      { question: "Come organizzi lo stoccaggio di merci diverse in magazzino?", category: "behavioral" },
      { question: "Arrivi merce danneggiata: qual è la procedura?", category: "situational" },
      { question: "Come gestisci un inventario con discrepanze?", category: "behavioral" },
      { question: "Quali DPI usi quotidianamente e perché?", category: "technical" }
    ]
  }
];

// Function to insert templates
async function seedTemplates() {
  console.log("Inizio inserimento template scorecard...\n");

  for (const template of templates) {
    try {
      // Check if template already exists
      const existing = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM scorecard_templates WHERE name = ?", [template.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existing) {
        console.log(`Template "${template.name}" già esistente, skip.`);
        continue;
      }

      // Insert template
      const templateId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO scorecard_templates (name, department, description) VALUES (?, ?, ?)`,
          [template.name, template.department, template.description],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      console.log(`Creato template: ${template.name} (ID: ${templateId})`);

      // Insert categories and criteria
      for (let catIdx = 0; catIdx < template.categories.length; catIdx++) {
        const cat = template.categories[catIdx];

        const categoryId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO scorecard_categories (template_id, name, weight, order_index) VALUES (?, ?, ?, ?)`,
            [templateId, cat.name, cat.weight, catIdx],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // Insert criteria
        for (let critIdx = 0; critIdx < cat.criteria.length; critIdx++) {
          const crit = cat.criteria[critIdx];
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO scorecard_criteria (category_id, name, description, description_low, description_high, order_index)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [categoryId, crit.name, crit.description || null, crit.description_low || null, crit.description_high || null, critIdx],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Insert questions
      if (template.questions) {
        for (let qIdx = 0; qIdx < template.questions.length; qIdx++) {
          const q = template.questions[qIdx];
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO interview_questions (template_id, question, category, order_index) VALUES (?, ?, ?, ?)`,
              [templateId, q.question, q.category, qIdx],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      console.log(`  - ${template.categories.length} categorie inserite`);
      console.log(`  - ${template.categories.reduce((sum, c) => sum + c.criteria.length, 0)} criteri inseriti`);
      console.log(`  - ${template.questions?.length || 0} domande inserite\n`);

    } catch (err) {
      console.error(`Errore inserimento template "${template.name}":`, err);
    }
  }

  console.log("\nInserimento completato!");
  process.exit(0);
}

// Run the seeder
seedTemplates();
