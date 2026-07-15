# E-mail sablonok (Supabase Dashboard)

Az alapértelmezett sablonok a Supabase saját `verify` végpontjára mutatnak, ami
a tokent URL-fragmentben adná vissza – azt a szerver nem látja. Ezért mindkét
sablont át kell írni úgy, hogy a `TokenHash`-t a saját `/auth/confirm`
route-unknak adja át. A sablonok cseréje után a linkek pontosan ugyanolyan
alakúak lesznek, mint amit az admin felület „Belépő link” gombja generál.

**Hol:** Dashboard → Authentication → Emails → Templates

---

## Invite („You've been invited")

Tárgy: `Pontgyűjtő fiók a RuhaForgóban`

```html
<h2>Szia{{ if .Data.full_name }} {{ .Data.full_name }}{{ end }}!</h2>
<p>
  A nyúli RuhaForgóban létrehoztuk neked a pontgyűjtő fiókodat. Állíts be egy
  jelszót, és onnantól bármikor megnézheted, hány pontod van.
</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/jelszo">
    Jelszó beállítása
  </a>
</p>
<p>Ha nem te hoztad be a ruhákat hozzánk, hagyd figyelmen kívül ezt a levelet.</p>
```

## Reset Password („Reset your password")

Tárgy: `Jelszó beállítása – RuhaForgó`

```html
<h2>Jelszó beállítása</h2>
<p>Az alábbi linken tudsz új jelszót megadni a RuhaForgó pontgyűjtő fiókodhoz:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/jelszo">
    Új jelszó megadása
  </a>
</p>
<p>Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.</p>
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
e-mailt, csak legenerálja a linket, amit Tündi átküld WhatsAppon vagy SMS-ben.
