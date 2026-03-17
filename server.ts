import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure pdfs directory exists
  const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  // API endpoint to send PDF
  app.post('/api/send-pdf', async (req, res) => {
    const { pdfBase64, email, phone, preNumber } = req.body;

    if (!pdfBase64 || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const fileName = `notificacao_${preNumber || Date.now()}.pdf`;
      const filePath = path.join(pdfsDir, fileName);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Save PDF locally
      fs.writeFileSync(filePath, pdfBuffer);

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const pdfUrl = `${appUrl}/pdfs/${fileName}`;

      // 1. Send Email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER || 'maracaju.sat@ms.gov.br',
        to: email,
        subject: 'Resumo do Pedido - NOTIFICAÇÃO EMITIDA',
        text: 'Olá, segue em anexo o PDF da Notificação emitida.',
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
          },
        ],
      };

      // 2. Send SMS (Twilio)
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        process.env.TWILIO_AUTH_TOKEN || 'your_auth_token'
      );

      let smsSent = false;
      try {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
          await twilioClient.messages.create({
            body: `Corpo de Bombeiros: Sua notificação de vistoria está pronta. Baixe aqui: ${pdfUrl}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone.replace(/\D/g, '').startsWith('55') ? `+${phone.replace(/\D/g, '')}` : `+55${phone.replace(/\D/g, '')}`,
          });
          smsSent = true;
        } else {
          console.log('Twilio credentials not configured, skipping SMS');
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }

      // Attempt to send email
      let emailSent = false;
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail(mailOptions);
          emailSent = true;
        } else {
          console.log('Email credentials not configured, skipping Email');
        }
      } catch (emailError) {
        console.error('Error sending Email:', emailError);
      }

      res.json({ 
        success: true, 
        pdfUrl, 
        message: 'Documento processado com sucesso!',
        emailSent,
        smsSent
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
