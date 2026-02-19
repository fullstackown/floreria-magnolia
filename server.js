import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import mercadopago from "mercadopago";
import path from "path";
import axios from "axios";

const app = express();

const publicPath = path.join(process.cwd(), "src", "dist");

// Cabeceras de seguridad (Google valora sitios seguros)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

app.use(bodyParser.json());

// SEO: robots.txt y sitemap.xml con Content-Type correcto para crawlers
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.sendFile(path.join(publicPath, "robots.txt"));
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  res.sendFile(path.join(publicPath, "sitemap.xml"));
});

// Archivos estáticos (HTML, CSS, JS, img, etc.)
app.use(express.static(publicPath));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Configurar Mercado Pago
mercadopago.configure({
  access_token: "APP_USR-131995419340909-122521-5f96c4268433dac257e1a251a4a7465f-537044860",
  // access_token: "TEST-131995419340909-122521-e4df4c80aae13e2ff12acacb48accd61-537044860",
});

// Endpoint para crear preferencia de pago
app.post("/create-order", async (req, res) => {
  try {
    const { carrito } = req.body;
    console.log(carrito[0])

    // Valida los datos recibidos
    if (!carrito[0].titulo || !carrito[0].precio || !carrito[0].cantidad) {
      return res.status(400).json({ error: "Faltan datos en el cuerpo de la solicitud." });
    }

    const preference = {
      items: [
        {
          title: carrito[0].titulo,
          description:"www.plancheto.com", // Descripción opcional
          unit_price: carrito[0].precio, // Asegura que sea un número
          quantity: carrito[0].cantidad, // Asegura que sea un entero
          currency_id: "ARS", // Moneda predeterminada
          picture_url: 'https://www.plancheto.com/img/logonegro.jpg'
        },
      ],
      back_urls: {
        success: "https://plancheto.com/success",
        failure: "https://plancheto.com/failure",
        pending: "https://plancheto.com/pending",
      },
      auto_return: "approved",
      notification_url: "https://plancheto.com/webhook",
    };

    const response = await mercadopago.preferences.create(preference);
    console.log(response.body.init_point)
    res.json({ url: response.body.init_point });
  } catch (error) {

    console.error("Error al crear la preferencia:", error);
    res.status(500).send("Error interno del servidor");
  }
});

// Webhook para manejar notificaciones de pagos
app.post("/webhook", async (req, res) => {
  try {
    const { type, id } = req.query;

    if (type === "payment") {
      const { data } = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          Authorization: `Bearer 92efce9f60832c8c5be22ed7d0cd25c35ea8b117a9458b237a8f68044bac7436`,
        },
      });

      console.log("Notificación de pago recibida:", data);

      if (data.status === "approved") {
        console.log("Pago aprobado para el ID:", data.id);
      } else {
        console.log("Estado del pago:", data.status);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error en el webhook:", error);
    res.sendStatus(500);
  }
});



// Iniciar servidor (PORT por variable de entorno en producción)
const PORT = process.env.PORT || 6767;
app.listen(PORT, () => {
  console.log(`Servidor Plan Cheto en http://localhost:${PORT}`);
});
