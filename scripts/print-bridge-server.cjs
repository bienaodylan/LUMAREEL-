// scripts/print-bridge-server.cjs (À exécuter localement sur le PC de l'atelier d'impression)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
let printer;
try {
  printer = require('printer');
} catch (e) {
  console.warn('Module node-printer non disponible en natif, simulation active');
}
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 35200;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Route de test pour vérifier si le Print Bridge est bien en ligne depuis la plateforme web
app.get('/status', (_req, res) => {
  try {
    const printers = printer?.getPrinters?.() || [];
    res.json({
      status: 'online',
      computer: process.env.COMPUTERNAME || 'ATELIER-PC',
      printers: printers.map((p) => ({ name: p.name, status: p.status }))
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Route de réception et d'impression directe du lot
app.post('/print-batch', (req, res) => {
  const { printerName, rectoBase64, batchId } = req.body;

  if (!rectoBase64) {
    return res.status(400).json({ success: false, message: 'Fichier Recto manquant.' });
  }

  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const rectoPath = path.join(tempDir, `${batchId}_RECTO.pdf`);
  fs.writeFileSync(rectoPath, Buffer.from(rectoBase64, 'base64'));

  if (printer && printer.printFile) {
    printer.printFile({
      filename: rectoPath,
      printer: printerName || printer.getDefaultPrinter()?.name,
      success: (jobID) => {
        console.log(`[Print Bridge] Travail Recto envoyé avec succès. ID Job: ${jobID}`);
        res.json({ success: true, jobID });
      },
      error: (err) => {
        console.error('[Print Bridge] Erreur impression:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });
  } else {
    res.json({ success: true, simulated: true, path: rectoPath });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[LUMARÉEL Print Bridge] En écoute sur le port ${PORT}`);
});
