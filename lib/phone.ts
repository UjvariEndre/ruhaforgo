// Telefonszám-kezelés. Két külön dolog:
//
//   kulcs      – kanonikus E.164 alak (+36301807725). Ezen megy az egyediség és
//                a keresés, függetlenül a beírt formától.
//   megjelenés – ugyanaz olvashatóan tagolva (+36 30 180 7725). Ezt tároljuk a
//                `profiles.phone` oszlopban.
//
// A kulcs számítása SQL-ben is megvan (`public.hu_phone_e164`, lásd
// supabase/schema.sql), és a `profiles.phone_e164` generált oszlopot az hajtja.
// Az az igazi garancia – ez itt a barátságos hibaüzenetért és a formázásért van.
// Ha az egyiket módosítod, a másikat is vezesd át.

/** A szám kanonikus alakja, vagy null, ha nincs benne számjegy. */
export function phoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let nsn: string | null = null;
  if (digits.startsWith("0036")) {
    nsn = digits.slice(4);
  } else if (
    digits.startsWith("36") &&
    (digits.length === 10 || digits.length === 11)
  ) {
    nsn = digits.slice(2);
  } else if (digits.startsWith("06")) {
    nsn = digits.slice(2);
  } else if (digits.length === 8 || digits.length === 9) {
    nsn = digits;
  }

  if (nsn && (nsn.length === 8 || nsn.length === 9)) return `+36${nsn}`;

  // Nem ismerjük fel magyar számként (pl. külföldi): maradnak a puszta
  // számjegyek, így legalább az azonos beírások ütköznek egymással.
  return digits;
}

/** A tárolandó, olvasható alak. Fel nem ismert számnál csak takarít. */
export function formatHuPhone(raw: string): string {
  const tidy = raw.trim().replace(/\s+/g, " ");
  const key = phoneKey(tidy);
  if (!key?.startsWith("+36")) return tidy;

  const nsn = key.slice(3);
  // Mobil: 2+3+4. Budapest: 1+3+4. Egyéb körzet: 2+3+3.
  if (nsn.length === 9)
    return `+36 ${nsn.slice(0, 2)} ${nsn.slice(2, 5)} ${nsn.slice(5)}`;
  if (nsn.startsWith("1"))
    return `+36 1 ${nsn.slice(1, 4)} ${nsn.slice(4)}`;
  return `+36 ${nsn.slice(0, 2)} ${nsn.slice(2, 5)} ${nsn.slice(5)}`;
}
