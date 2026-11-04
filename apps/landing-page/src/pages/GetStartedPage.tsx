import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Building2,
  Download,
  ExternalLink,
  Mail,
  QrCode,
  Smartphone
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";

import { Logo } from "../components/Logo";
import { CaddieProfileScreen, CourseDetailScreen, DiscoveryScreen, PhoneShell } from "../components/PhoneMockup";
import { adminWebUrl, clubContactEmail, installLinks } from "../config/links";

type StoreLinkProps = {
  icon: ReactNode;
  label: string;
  url: string | undefined;
};

function StoreLink({ icon, label, url }: StoreLinkProps) {
  const absoluteUrl = url ? new URL(url, window.location.href).href : undefined;

  return (
    <div className="store-link">
      <div className="store-qr" aria-label={url ? `QR code for ${label}` : `${label} link coming soon`}>
        {absoluteUrl ? (
          <QRCodeSVG bgColor="#FCFBF7" fgColor="#173F35" level="M" marginSize={1} size={108} value={absoluteUrl} />
        ) : (
          <div className="grid size-full place-items-center rounded-xl border border-dashed border-line bg-ivory text-muted">
            <QrCode size={28} strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold">{icon}{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{url ? "Scan the code or open the link." : "Link coming soon."}</p>
      </div>
      {url ? (
        <a className="store-action" href={absoluteUrl} rel="noreferrer" target="_blank" aria-label={`Open ${label}`}>
          <ExternalLink size={15} />
        </a>
      ) : (
        <span className="store-unavailable">Soon</span>
      )}
    </div>
  );
}

function MobileRoleCard({ description, role }: { description: string; role: "golfer" | "caddie" }) {
  const title = role === "golfer" ? "I’m a golfer" : "I’m a caddie";
  const links = installLinks[role];

  return (
    <article className="install-card">
      <div className="flex items-start justify-between gap-5">
        <div>
          <span className="install-icon"><Smartphone size={20} strokeWidth={1.6} /></span>
          <h2 className="mt-8 text-3xl font-medium tracking-[-0.05em]">{title}</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{description}</p>
        </div>
        <span className="rounded-full bg-forest/7 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-forest">Mobile app</span>
      </div>
      <div className="mt-8 space-y-3">
        <StoreLink icon={<Apple size={15} />} label="Download on the App Store" url={links.appStore} />
        <StoreLink icon={<Download size={15} />} label="Download Android APK" url={links.androidApk} />
      </div>
    </article>
  );
}

export function GetStartedPage() {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-line bg-warm-white/90 backdrop-blur-xl">
        <div className="page-container flex h-[76px] items-center justify-between">
          <Logo />
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-forest transition-colors hover:text-forest-dark" href="/">
            <ArrowLeft size={16} /> Back to home
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pb-20 pt-20 sm:pb-28 sm:pt-28">
          <div className="hero-glow !right-auto !left-[-28%] !top-[-25%]" />
          <div className="page-container relative">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow justify-center before:hidden">Choose your NoBogey experience</p>
              <h1 className="mt-6 text-[clamp(3.3rem,7vw,6.8rem)] font-medium leading-[0.92] tracking-[-0.068em]">
                Are you ready
                <br />
                <span className="text-forest">for your next round?</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted">
                Choose the experience that fits your role. {installLinks.golfer.androidApk || installLinks.caddie.androidApk
                  ? "Download the Android preview below; App Store availability will follow."
                  : "Android APK download links will appear here when the preview is ready; App Store availability will follow."}
              </p>
            </div>

            <div className="get-started-phone-showcase relative mx-auto mt-12 h-[440px] w-full max-w-[760px] sm:mt-16 sm:h-[560px]" aria-label="NoBogey mobile app previews">
              <div className="phone-orbit" aria-hidden="true" />
              <PhoneShell className="hero-phone hero-phone-left" screenLabel="NoBogey course details app screen"><CourseDetailScreen /></PhoneShell>
              <PhoneShell className="hero-phone hero-phone-main" screenLabel="NoBogey course discovery app screen"><DiscoveryScreen /></PhoneShell>
              <PhoneShell className="hero-phone hero-phone-right" screenLabel="NoBogey caddie profile app screen"><CaddieProfileScreen compact /></PhoneShell>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-2">
              <MobileRoleCard
                role="golfer"
                description="Discover courses, choose a tee time and caddie, and follow your confirmed bookings through mutual meetup and payment confirmation."
              />
              <MobileRoleCard
                role="caddie"
                description="Manage your roster, respond to requests, and confirm meetup and payment received together with your golfer."
              />
            </div>

            <section className="club-access-card">
              <div className="max-w-xl">
                <span className="install-icon install-icon-dark"><Building2 size={21} strokeWidth={1.6} /></span>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[#d8b66a]">For club teams</p>
                <h2 className="mt-3 text-[clamp(2.2rem,4vw,4rem)] font-medium leading-[1] tracking-[-0.055em] text-white">Manage your club with NoBogey.</h2>
                <p className="mt-5 text-base leading-7 text-white/65">Verify registered caddies, manage tee-time availability, and coordinate your club’s roster from the admin portal.</p>
              </div>
              <div className="club-access-actions">
                <div>
                  <p className="text-sm font-semibold text-white">Club not registered yet?</p>
                  <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#d8b66a] hover:text-white" href={`mailto:${clubContactEmail}?subject=NoBogey%20club%20registration`}>
                    <Mail size={16} /> Email us
                  </a>
                </div>
                <div className="h-px bg-white/12 lg:h-14 lg:w-px" />
                <div>
                  <p className="text-sm font-semibold text-white">Already registered?</p>
                  <a className="button-light mt-3" href={adminWebUrl}>
                    Sign in to admin <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
