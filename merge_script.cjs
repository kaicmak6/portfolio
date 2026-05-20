const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, 'apps/web/src/locales/en.local.json');

const newJson = {
  Projects: {
    items: [
      {
        id: 'cathay-booking',
        title: 'Cathay Pacific: Booking Core Modernization',
        category: 'Lead of Leads (Greenfield)',
        description: 'Orchestrated the technical delivery and team scaling of a mission-critical booking engine.',
        badges: ['Lead of Leads', 'Team Scaling', 'Next.js 16'],
        desc: '<p><b>The Challenge:</b> Modernizing a mission-critical booking engine while rapidly scaling the engineering workforce.</p><ul><li><b>Strategic Scaling:</b> Managed the transition and growth of the team from <b>8 to nearly 20 engineers</b> across 4 parallel workstreams.</li><li><b>Technical Governance:</b> Established <b>Hierarchical Branching</b> and Monorepo standards to maintain velocity during team expansion.</li><li><b>Type Safety:</b> Enforced <b>Typia AOT validation</b> to eliminate runtime schema errors, ensuring 99.9% system reliability.</li></ul>',
        metrics: ['Scalable Team (Up to 20)', 'Next-Gen Stack Implementation', 'Zero-Legacy Greenfield'],
        tech: [
          { emoji: '⚛️', label: 'Next.js 16' },
          { emoji: '🦁', label: 'NestJS BFF' },
          { emoji: '🛡️', label: 'Typia' },
          { emoji: '🎨', label: 'Mantine v8' },
        ],
        demo: 'https://cathaypacific.com',
        images: ['https://portfolio-cms.mak-cloud.com/assets/projects/cathay-booking-detail.jpeg'],
        emoji: '✈️',
      },
    ],
  },
  ExperiencePage: {
    jobs: [
      {
        id: 'exp-lead',
        title: 'Software Engineering Specialist (Lead of Leads)',
        company: 'Accenture Hong Kong',
        date: '2024 – Dec 2025',
        badge: 'Engineering Management',
        description: 'Appointed as the technical authority for Cathay\'s Greenfield booking transformation, managing high-stakes delivery through strategic orchestration.<br/><br/>• <b>Team Growth:</b> Mentored 4 stream leads and orchestrated a team that <b>scaled up to 20 engineers</b>. Established quantitative onboarding rubrics to maintain quality during rapid expansion.<br/>• <b>Engineering Standards:</b> Architected the Next.js 16 core with a focus on Monorepo governance and runtime type safety using <b>Typia</b>.<br/>• <b>SDLC Governance:</b> Defined hierarchical branching strategies to ensure stability across complex multi-phase releases.',
      },
    ],
  },
  Experience: {
    jobs: [
      {
        id: 'exp-lead',
        title: 'Lead of Leads (Engineering Specialist)',
        company: 'Accenture HK',
        date: '2024 – 2025',
        description: 'Orchestrated a team scaling up to 20 engineers for Greenfield transformation. Focus: Management, Next.js 16, and SDLC Governance.',
        icon: 'briefcase',
        badge_color: 'blue',
      },
    ],
  },
};

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const targetJson = JSON.parse(fileContent);

  // Perform deep merge
  const mergedJson = deepMerge(targetJson, newJson);

  fs.writeFileSync(filePath, JSON.stringify(mergedJson, null, 2), 'utf8');
  console.log('Successfully merged and updated file.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
