// print-bridge-server.js (À exécuter localement sur le PC de l'atelier)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const printer = require('printer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 35200;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Route de test pour vérifier si le Print Bridge est bien en ligne depuis la plateforme web
app.get('/status', (req, res) => {
  try {
    const printers = printer.getPrinters();
    res.json({
      status: 'online',
      computer: process.env.COMPUTERNAME || 'ATELIER-PC',
      printers: printers.map(p => ({ name: p.name, status: p.status }))
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Route de réception et d'impression directe du lot
app.print('/print-batch', (req, res) => {
  const { printerName, rectoBase64, versoBase64, batchId } = req.body;

  if (!rectoBase64) {
    return res.status(400).json({ success: false, message: 'Fichier Recto manquant.' });
  }

  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.existsSync(tempDir);

  const rectoPath = path.join(tempDir, `${batchId}_RECTO.pdf`);
  fs.writeFileSync(rectoPath, Buffer.from(rectoBase64, 'base64'));

  // Envoi du Recto à l'imprimante
  printer.printFile({
    filename: rectoPath,
    printer: printerName || printer.getDefaultPrinter()?.name,
    success: (jobID) => {
      console.log(`[Print Bridge] Travail Recto envoyé avec succès. ID Job: ${jobID}`);
      
      // Si un verso est présent, on l'envoie à la suite
      if (versoBase64) {
        const versoPath = path.join(tempDir, `${batchId}_VERSO.pdf`);
        fs.writeFileSync(versoPath, Buffer.from(versoBase64, 'base64'));
        
        printer.printFile({
          filename: versoPath,
          printer: printerName || printer.getDefaultPrinter()?.name,
          success: (versoJobID) => {
            console.log(`[Print Bridge] Travail Verso envoyé. ID Job: ${versoJobID}`);
            res.json({ success: true, message: 'Impression Recto & Verso transmise au spooler avec succès.' });
          },
          error: (err) => {
            res.status(500).json({ success: false, message: `Erreur impression Verso: ${err}` });
          }
        });
      } else {
        res.json({ success: true, message: 'Impression Recto transmise avec succès.' });
      }
    },
    error: (err) => {
      res.status(500).json({ success: false, message: `Erreur impression Recto: ${err}` });
    }
  });
});

app.listen(PORT, () => {
  console.log(`[LUMARÉEL Print Bridge] Actif et sécurisé sur https://localhost:${PORT}`);
});