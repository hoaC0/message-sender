const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// stellt sicher dass datei existiert sonst wird erstellt
if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}

const server = http.createServer((req, res) => {
    // CORS header setzen ... Diese Header erlauben Anfragen von anderen Domains (wichtig für die Entwicklung
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // OPTIONS anfragen für CORS beantworten
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // post request für neue nachrichten
    if (req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // nachricht mit timestamp speichern/erstellen
                const timestamp = Date.now();
                const message = {
                    title: data.title,
                    message: data.message,
                    timestamp: timestamp
                };
                
                // nachricht aus datei lesen
                let messages = [];
                if (fs.existsSync(MESSAGES_FILE)) {
                    const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf8');
                    if (fileContent) {
                        messages = JSON.parse(fileContent);
                    }
                }
                
                // nachricht adden
                messages.push(message);
                
                // nachrichten in datei schreiben/spiechern
                fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('Error processing message:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid data format' }));
            }
        });
    }
    
    // GET Anfrage fuer index.html
    else if (req.url === "/" || req.url === "/index.html") { 
        fs.readFile(path.join(__dirname, "public/index.html"), (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.end("404 Not Found");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
        });
    }
    
    // GET anfrage fuer send.html
    else if (req.url === "/send" || req.url === "/send.html") {
        fs.readFile(path.join(__dirname, "public/send.html"), (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.end("404 Not Found");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
        });
    }
    
    // GET anfrage fuer script.js
    else if (req.url === "/script.js") {
        fs.readFile(path.join(__dirname, "public/script.js"), (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/javascript" });
                res.end("404 Not Found");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/javascript" });
            res.end(data);
        });
    }
    
    // API endpoint um nachrichten abzurufen
    else if (req.url === "/api/messages" && req.method === "GET") {
        // nachrichten aelter als 5 tage geloescht
        let messages = [];
        if (fs.existsSync(MESSAGES_FILE)) {
            const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf8');
            if (fileContent) {
                messages = JSON.parse(fileContent);
                
                // 5 Tage in ms
                const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                
                // nachrichten behalten die nicht aelter als 5 tage sind
                const filteredMessages = messages.filter(message => {
                    return (now - message.timestamp) < fiveDaysInMs;
                });
                
                // datei aktualisieren wenn nachrichten geloescht
                if (filteredMessages.length !== messages.length) {
                    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(filteredMessages));
                    messages = filteredMessages;
                }
            }
        }
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(messages));
    }
    
    // 404 für alle anderen requests
    else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
    }
});

server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log(`Nachrichtenformular: http://localhost:${PORT}/send`);
});

// alle 24h alte nachrichten loeschen - funktion
function cleanupOldMessages() {
    if (fs.existsSync(MESSAGES_FILE)) {
        const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf8');
        if (fileContent) {
            let messages = JSON.parse(fileContent);
            
            // 5 Tage in ms
            const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            // nachrichten behalten die nicht aelter als 5 tage sind
            const filteredMessages = messages.filter(message => {
                return (now - message.timestamp) < fiveDaysInMs;
            });
            
            // datei aktualisieren wenn nachrichten geloescht
            if (filteredMessages.length !== messages.length) {
                console.log(`${messages.length - filteredMessages.length} alte Nachrichten gelöscht`);
                fs.writeFileSync(MESSAGES_FILE, JSON.stringify(filteredMessages));
            }
        }
    }
}

// 1x pro tag ausführen
setInterval(cleanupOldMessages, 24 * 60 * 60 * 1000);
// bei start auch ausgeführt
cleanupOldMessages();