import { getTranslations } from 'next-intl/server';

import { PlateBand } from '../molecules/PlateBand/PlateBand';
import { CertificationsSection, ChatBot, ContactInfo, ExperienceSection, HeroBullets, PortfolioHeroSection, SkillsSection } from '../organisms/';
import { OperationsBand } from '../organisms/OperationsBand/OperationsBand';

// `next/image` leaves an `unoptimized` src exactly as written, so the base path
// has to be prepended here or the plates resolve to `/ops/…` and 404.
// The filename carries the content hash: plates are served immutable, so a new
// photograph must arrive as a new name or browsers keep the old bytes.
const opsPlate = (name: string) => `${process.env.BASE_PATH ?? ''}/ops/${name}`;

export const HomePage = async () => {
  const t = await getTranslations('PlateBand');

  return (
    <>
      <HeroBullets plateSrc={opsPlate('terminal-fog.af04348a.webp')} />
      <CertificationsSection />
      <ChatBot />
      <PlateBand
        src={opsPlate('gantry-low.5e26eb6a.webp')}
        width={2560}
        height={1440}
        label={t('fig1_label')}
        caption={t('fig1_caption')}
        align="start"
      />
      <PortfolioHeroSection />
      <SkillsSection />
      <OperationsBand />
      <ExperienceSection />
      <PlateBand
        src={opsPlate('approach-haze.d23679a4.webp')}
        width={2560}
        height={1440}
        label={t('fig2_label')}
        caption={t('fig2_caption')}
        align="end"
      />
      <ContactInfo />
    </>
  );
};
