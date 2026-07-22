# E-mail sablonok (Supabase Dashboard)

Az alapértelmezett sablonok a Supabase saját `verify` végpontjára mutatnak, ami
a tokent URL-fragmentben adná vissza – azt a szerver nem látja. Ezért mindkét
sablont át kell írni úgy, hogy a `TokenHash`-t a saját `/auth/confirm`
route-unknak adja át. A sablonok cseréje után a linkek pontosan ugyanolyan
alakúak lesznek, mint amit az admin felület „Belépő link” gombja generál.

**Hol:** Dashboard → Authentication → Emails → Templates. A jelenlegi (márkás)
sablonokat NEM kézzel, hanem a Management API-n keresztül állítottuk be
(`PATCH /v1/projects/{ref}/config/auth`, mezők: `mailer_templates_invite_content`,
`mailer_subjects_invite`, `mailer_templates_recovery_content`,
`mailer_subjects_recovery`). A Cloudflare a python `urllib`-et blokkolja → `curl`
kell; a JSON-t python3-mal érdemes építeni (a HTML escapelése miatt).

A sablonok a RuhaForgó palettáján alapulnak (krém háttér `#f6e9d2`, kártya
`#fcf6ea`, keret `#e2d3b6`, zsályazöld gomb `#5e7146`, szöveg `#3b3a30`, halvány
`#8a8270`), táblázatos elrendezéssel és inline stílussal (e-mail-kliens-barát),
a logó a `https://ruhaforgo.com/logo.jpg`-ról jön.

---

## Invite („You've been invited")

Tárgy: `Pontgyűjtő fiók a RuhaForgóban`

```html
<!doctype html>
<html lang="hu">
<body style="margin:0;padding:0;background-color:#f6e9d2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6e9d2;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#fcf6ea;border:1px solid #e2d3b6;border-radius:16px;">
          <tr>
            <td align="center" style="padding:36px 32px 12px 32px;">
              <img src="https://ruhaforgo.com/logo.jpg" width="96" height="96" alt="RuhaForgó" style="display:block;width:96px;height:96px;border-radius:16px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 0 36px;font-family:Arial,Helvetica,sans-serif;">
              <h1 style="margin:0 0 18px 0;font-size:21px;line-height:1.3;color:#3b3a30;text-align:center;font-weight:bold;">
                Szia{{ if .Data.full_name }} {{ .Data.full_name }}{{ end }}!
              </h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#3b3a30;">
                A nyúli <strong>RuhaForgóban</strong> létrehoztuk neked a pontgyűjtő fiókodat. Állíts be egy jelszót, és onnantól bármikor megnézheted, hány pontod van.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:6px 36px 28px 36px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/jelszo"
                 style="display:inline-block;background-color:#5e7146;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:13px 30px;border-radius:9px;">
                Jelszó beállítása
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px 36px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8270;text-align:center;">
                Ha nem te hoztad be a ruhákat hozzánk, nyugodtan hagyd figyelmen kívül ezt a levelet.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f6e9d2;padding:16px 36px;border-top:1px solid #e2d3b6;border-radius:0 0 16px 16px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:12px;color:#8a8270;text-align:center;letter-spacing:0.3px;">
                RuhaForgó &middot; Nyúl
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Reset Password („Reset your password")

Tárgy: `Jelszó beállítása – RuhaForgó`

```html
<!doctype html>
<html lang="hu">
<body style="margin:0;padding:0;background-color:#f6e9d2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6e9d2;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#fcf6ea;border:1px solid #e2d3b6;border-radius:16px;">
          <tr>
            <td align="center" style="padding:36px 32px 12px 32px;">
              <img src="https://ruhaforgo.com/logo.jpg" width="96" height="96" alt="RuhaForgó" style="display:block;width:96px;height:96px;border-radius:16px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 0 36px;font-family:Arial,Helvetica,sans-serif;">
              <h1 style="margin:0 0 18px 0;font-size:21px;line-height:1.3;color:#3b3a30;text-align:center;font-weight:bold;">
                Jelszó beállítása
              </h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#3b3a30;">
                Az alábbi gombbal új jelszót adhatsz meg a <strong>RuhaForgó</strong> pontgyűjtő fiókodhoz.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:6px 36px 28px 36px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/jelszo"
                 style="display:inline-block;background-color:#5e7146;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:13px 30px;border-radius:9px;">
                Új jelszó megadása
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px 36px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8270;text-align:center;">
                Ha nem te kérted, nyugodtan hagyd figyelmen kívül ezt a levelet – a jelszavad változatlan marad.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f6e9d2;padding:16px 36px;border-top:1px solid #e2d3b6;border-radius:0 0 16px 16px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:12px;color:#8a8270;text-align:center;letter-spacing:0.3px;">
                RuhaForgó &middot; Nyúl
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Amitől ez egyáltalán működik

**A `SiteURL` legyen `https://ruhaforgo.com`** – Dashboard → Authentication →
URL Configuration. A sablonok ezt fűzik a link elejére.

**Egyéni SMTP kötelező.** A Supabase docs szerint: *"Unless you configure a
custom SMTP server for your project, Supabase Auth will refuse to deliver
messages to addresses that are not part of the project's team."*

Fontos, hogy ez **csendes** kudarc: kipróbáltuk, és a `inviteUserByEmail` egy
team-en kívüli címre is **hiba nélkül, sikerrel tér vissza**, az auth-napló is
`mail.send`-et ír – csak a levél nem érkezik meg. Kódból tehát nem lehet
észrevenni. (A naplóban a `mail_from` árulkodik: `noreply@mail.app.supabase.io`
= beépített küldő, nincs egyéni SMTP.)

Dashboard → Authentication → Emails → SMTP Settings. A `ruhaforgo.com` domain
már a tiéd, szóval pl. a Resend domain-hitelesítése menni fog. Az e-mail rate
limit egyéni SMTP-vel 30 új felhasználó/óra (állítható), ami bőven elég. A
beépített küldő ennél jóval szigorúbb, és a docs szerint nem éles használatra van.

Amíg ez nincs kész, az admin felület „Belépő link” gombja pótolja: az nem küld
e-mailt, csak legenerálja a linket, amit Tünde átküld WhatsAppon vagy SMS-ben.
