# Contact setup

`src/data/contacts.ts` is the only place where public contact values are configured. Do not hardcode a contact URL in a component.

## Instagram

Set `contacts.instagram` to the full HTTPS profile URL. The shared contact component then exposes a monochrome, recognizable Instagram action in the contact ecosystem and compact menu treatment. Leave it empty until the official account exists.

## WhatsApp

Set `contacts.whatsapp` to the business number in international format. Non-numeric formatting is stripped when the `wa.me` deep link is built. The site adds a localized opening message:

- EN: “Hey. I have a project in mind.”
- LV: “Sveiks. Man padomā ir projekts.”

The same link opens the installed app where the platform supports it and the WhatsApp web flow elsewhere. There is deliberately no floating green button.

## Domain email

Choose and register the real public domain before replacing the current email value. Do not infer the domain from the wordmark.

Cloudflare Email Routing is suitable for free inbound forwarding, but it does not by itself provide a clean outbound mailbox identity. A reply sent from a personal destination inbox can expose that personal address unless a separate SMTP/send-as arrangement is configured. Cloudflare documents that limitation in its [Email Routing postmaster reference](https://developers.cloudflare.com/email-service/reference/postmaster/).

Before launch, compare providers against the complete reply workflow—not only the monthly price. The chosen setup must support:

- receiving mail at the branded address;
- sending and replying with that same address in `From`;
- authenticated SMTP or an equivalent supported send path;
- MX, SPF and DKIM;
- a staged DMARC policy, starting with monitoring;
- TLS and a real deliverability test to Gmail, Outlook and another independent mailbox.

Once the mailbox is verified, replace `contacts.email` with the branded address. The mail links, copy control and structured data update from that single value.

## Analytics handoff

Contact, project and language actions carry `data-analytics-event` and contextual data attributes. A future lightweight analytics provider can bind to those hooks without changing the visible components. Do not add a provider until its purpose and privacy impact are agreed.
