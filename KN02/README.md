# KN-Webgoat-02: OWASP Top 10 – WebGoat
Lernziele
- Sie können SQL-Injection-Angriffe durchführen und die Gegenmassnahme (Prepared Statements) erklären.
- Sie können Reflected und Stored XSS in einer Webapplikation ausnutzen und den Unterschied erklären.
- Sie können einen CSRF-Angriff konzipieren und eine funktionsfähige Angriffs-HTML-Seite erstellen.
- Sie können Broken Access Control (IDOR) in einer Applikation nachweisen und serverseitige Autorisierung erklären.
- Sie können die Struktur eines JWT-Tokens analysieren und die alg:none-Schwachstelle ausnutzen.
- Sie können zu jeder Schwachstelle die passende OWASP Top 10 Kategorie benennen.
***
### A) WebGoat starten (Pflicht, zuerst lösen) (10%)
- Edit inbound rules and add a new rule to allow TCP port 8080 (WebGoat) ![img.png](imgs/img.png)
- Start WebGoat in the EC2 instance in docker: `docker run -d --name webgoat -p 8080:8080 webgoat/webgoat` 
- Check if WebGoat is running: `docker ps`and visit `http://<EC2-Public-IP>:8080/WebGoat` in your browser. ![img_1.png](imgs/img_1.png)
- Create new User → `zakria:gugus_` ![img_2.png](imgs/img_2.png)
### B) SQL Injection (18%)
#### B1 – Login Bypass
- go to through the A3 SQL Injection lesson in WebGoat until the login bypass task.
  - 2: `SELECT department FROM employees WHERE first_name = 'Bob' AND last_name = 'Franco'`
  - 3: `UPDATE employees SET department='Sales' WHERE first_name='Tobi' AND last_name='Barnett'`
  - 4: `ALTER TABLE employees ADD phone varchar(20)`
  - 5: `GRANT ALL ON grant_rights TO unauthorized_user`
  - 9: `SMITH' or '1'='1`
  - 10: `1` & `1 OR 1=1`
- use name in first form field, and this payload `' OR '1'='1` in the second form field. ![img_3.png](imgs/img_3.png)
#### B2 – Query Chaining: Integrität kompromittieren
- do the 12th (Compromising Integrity with Query chaining) task in the A3 SQL Injection lesson.
- payload: `3SL99A'; UPDATE employees SET salary=100000 WHERE userid=37648;`. with the `'` i close the first select query, then with `;` I start a new query. ![img_4.png](imgs/img_4.png)
- Q&A
- Zeichnen Sie auf, wie das SQL-Statement aus B1 vor und nach dem Einschleusen des Payloads aussieht. Erklären Sie, warum die Authentifizierung dadurch umgangen wird.
- I was able to get all employees by setting a tricky payload `' OR '1'='1`, here the `'` closes the first string, then `OR '1'='1` is always true. wich means that the query will return all employees, since the condition is always true.
- Wie funktionieren Prepared Statements (parameterisierte Abfragen) technisch? Warum kann SQL Injection damit nicht mehr funktionieren?
- The're are two steps, prepare (1) → query is sent to server, but not executed yet, the server parses, compiles and optimizes the query without executing it. execute (2) → the application binds the parameters and the query is executed. since the parameters are sent separately, they cannot interfere with the query structure, which means that SQL Injection cannot work. [W3Schools](https://www.w3schools.com/sql/sql_prepared_statements.asp).
- Welche OWASP Top 10 Kategorie (2025) beschreibt SQL Injection? Nennen Sie Nummer und Bezeichnung.
- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- Nennen Sie neben SQL Injection zwei weitere Injection-Varianten (z.B. OS Command Injection, LDAP Injection) und beschreiben Sie kurz, was dabei injiziert wird und wo die Gefahr liegt.
- OS Command Injection → you send script through the sql query wich opens the terminal on the sql server, and you can execute commands on the server.
- LDAP Injection → you send malicious LDAP statements through the sql query, this way you can manipulate the LDAP and give yourself access (through roles manipulation) to the system.
### C) Cross-Site Scripting (XSS) (18%)
#### C1 – Reflected XSS & DOM-based XSS
##### C1a – Try It! Reflected XSS
- I had to test the input field, to check if they were vulnerable to XSS, I tried to inject a simple script `<script>alert('XSS')</script>` and it worked, the alert popped up. ![img_5.png](imgs/img_5.png)
##### C1b – Identify potential for DOM-Based XSS
- Now i had to find a potential for DOM-Based XSS, which was finding a test route that stayed in the app during production. ![img_6.png](imgs/img_6.png)
- Thne I had to use that exploit, since the app was vulnerable to XSS, I could inject a script in the URL, which would be executed when the page was loaded. ![img_7.png](imgs/img_7.png) ![img_8.png](imgs/img_8.png)
#### C2 – Stored XSS
- Here the first task was to paste a script in the input field for the post comments `<script>alert('Stored XSS')</script>`. ![img_9.png](imgs/img_9.png). The goal was to check if the script was called when the page was loaded. ![img_10.png](imgs/img_10.png)
- Q&A
- Was ist der zentrale Unterschied zwischen Reflected XSS und Stored XSS hinsichtlich Persistenz und Reichweite? 
- Reflected XSS is not persistent, it only affects the user who clicks on the malicious link, while Stored XSS is persistent, it affects all users who visit the page where the malicious script is stored.
- Was unterscheidet DOM-based XSS von Reflected XSS – warum ist DOM-based XSS für serverseitige Filter schwieriger zu erkennen?
- DOM-based XSS is executed on the client side, which means that the malicious script is executed in the user's browser, not on the server. This makes it harder for server-side filters to detect and prevent it, as the malicious code is not sent to the server for processing.
- Was bedeutet Output Encoding und warum schützt es gegen XSS? Geben Sie ein konkretes Beispiel, wie <script> nach dem Encoding aussieht.
- Output Encoding is the process of converting special characters in [html entity](https://www.w3schools.com/html/html_entities.asp). For example, `<script>` becomes `&lt;script&gt;`. This prevents the browser from interpreting the characters as HTML or JavaScript, thus protecting against XSS attacks.
- Was ist der HTTP-Header Content-Security-Policy (CSP) und wie schränkt er XSS ein? (Recherchieren Sie falls nötig.)
- [Content-Security-Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) is a security feature that allows web developers to control the resources that a web page can load. For example, a CSP header might specify that only scripts from the same origin or specific trusted domains can be executed, thus mitigating the risk of XSS.
- Welche OWASP Top 10 Kategorie (2021) beschreibt XSS? Nennen Sie Nummer und Bezeichnung.
- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/#:~:text=CWE%2D80%20Improper%20Neutralization%20of%20Script%2DRelated%20HTML%20Tags%20in%20a%20Web%20Page%20(Basic%20XSS)
### D) CSRF – Cross-Site Request Forgery (18%)
- First of all I had to pay attention to the details, like if I clicked submit wich page it would show me, there I inspected the request and noted down request params. ![img_11.png](imgs/img_11.png) ![img_12.png](imgs/img_12.png)
- Afterwards I had to adjust the html site with the payloads I noted. `see ./csrf.html` and it worked. ![img_13.png](imgs/img_13.png) ![img_14.png](imgs/img_14.png)
- Q&A
- Warum schickt der Browser den Session-Cookie mit, wenn die Anfrage von csrf-attack.html (einer lokalen Datei) kommt – obwohl das Opfer diese Seite nie bewusst besucht hat?
- The browser automatically includes cookies associated with the target domain in requests made to that domain, regardless of where the request comes from.
- Was ist ein CSRF-Token und warum kann eine Angreifer-Seite ihn nicht einfach aus dem Formular lesen?
- A CSRF token is a unique, secret value generated by the server and included in forms to protect against CSRF attacks. An attacker cannot read the token from the form because it is not accessible to them; it is only sent to the server when the actual user submits the form, ensuring that the request is valid and originated from the intended user.
- Was bewirkt das SameSite=Strict-Flag bei einem Cookie und wie schützt es vor CSRF?
- The SameSite=Strict flag on a cookie instructs the browser to only send the cookie in requests originating from the same site.
- Welche OWASP Top 10 Kategorie (2025) beschreibt CSRF am ehesten? Nennen Sie Nummer und Bezeichnung.
- [A05_2025-Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) && [A02_2025-Security_Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/)7
### E) Broken Access Control – IDOR (18%)
- Now the main topic is unauthorized attacks, so you're authenticated, but you want to access data that you shouldn't be able to access.
- first task was to login with `tom:cat` ![img_15.png](imgs/img_15.png)
- second task was to find payloads/request infos that aren't shown but are sent from the server.
- the third task was to get the profile infos trough a GET request. ![img_16.png](imgs/img_16.png)
- the 4th task had 2 tasks, 
  - 1st was to fetch another users profile, i had to test the user ids until it worked. ![img_17.png](imgs/img_17.png)
  - 2nd was to edit the user profile. ![img_18.png](imgs/img_18.png)
- Q&A
- Warum reicht es nicht, eine Ressource einfach «nicht zu verlinken», um sie zu schützen? (Stichwort: Security through Obscurity)
- Security through Obscurity is not a reliable because it relies on keeping the implementation details secret rather than implementing proper access controls. If an attacker discovers the hidden resource, they can access it without any restrictions. 
- Wie hätte die Applikation den IDOR-Angriff verhindern können? Beschreiben Sie die notwendige serverseitige Prüfung.
- The application could have prevented the IDOR attack by implementing proper server-side authorization checks
- Was ist der Unterschied zwischen horizontaler und vertikaler Privilegienerweiterung? Welche Form zeigt dieses IDOR-Beispiel?
- Horizontal privilege escalation occurs when a user gains access to resources or actions that belong to other users with the same level of privileges.
- Vertical privilege escalation occurs when a user gains access to resources or actions that are reserved for users with higher privileges.
- Welche OWASP Top 10 Kategorie (2025) beschreibt Broken Access Control? Nennen Sie Nummer und Bezeichnung und erklären Sie, warum sie auf Platz 1 steht.
- [A01_2025-Broken_Access_Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
### F) Broken Authentication – JWT Tokens (18%)
- Now the main topic is to analyze JWT tokens, and find out it's vulnerabilities.
- 1st task was to decode a token, read it's info and cite the username present in the payload. ![img_19.png](imgs/img_19.png) ![img_20.png](imgs/img_20.png)
- 2nd task was to alter the user role in the payload. I tried by just changing the payload, that didn't work so I had to change the algorithm in the token to none and it worked. ![img_21.png](imgs/img_21.png) ![img_22.png](imgs/img_22.png) ![img_23.png](imgs/img_23.png) ![img_24.png](imgs/img_24.png) ![img_25.png](imgs/img_25.png)
- next was to analyze the code, wich was a bit difficult and time consuming, since I don't know how to search for java docs. but I managed to do it with the help of AI. ![img_26.png](imgs/img_26.png)
- Q&A
- Warum ist es ein Sicherheitsproblem, wenn ein Server "alg":"none" akzeptiert?
- because it allows an attacker to create a JWT with no signature, so without any verification, the server will accept it as valid.
- JWT-Payloads sind nur Base64url-kodiert, nicht verschlüsselt. Was bedeutet das für den Umgang mit sensiblen Daten im Token?
- It means that anyone who has access to the token can decode it and read the payload.
- Welche Massnahmen schützen gegen JWT-Angriffe? Nennen Sie mindestens drei (z.B. Algorithmus-Whitelist, kurze Ablaufzeiten, serverseitige Signaturprüfung).
- Algorithmus-Whitelist: the server has a list of allowed algorithms and rejects any token that uses an algorithm not on the list.
- Kurze Ablaufzeiten: the server sets a short expiration time for tokens, so that even if a token is compromised, it will only be valid for a short timee.
- Serverseitige Signaturprüfung: the server verifies the signature of the token to ensure that it has not been tampered with.
- Welche OWASP Top 10 Kategorie (2021) beschreibt Broken Authentication? Nennen Sie Nummer und Bezeichnung.
- [A07:2025-Broken_Authentication](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)