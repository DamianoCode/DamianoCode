import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Publish aggregate dates and counts only.
const query = `query { user(login: "DamianoCode") { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`;
const response = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8' }));
if (response.errors) throw new Error(JSON.stringify(response.errors));
const today = new Date().toISOString().slice(0, 10);
const days = response.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap(week => week.contributionDays).filter(day => day.date <= today).slice(-31);
if (days.length !== 31 || days.some(day => !Number.isInteger(day.contributionCount) || day.contributionCount < 0)) {
  throw new Error('Expected 31 valid contribution days; keeping the existing graphs.');
}
const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
const max = Math.max(1, ...days.map(day => day.contributionCount));
const assets = fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(assets, { recursive: true });
const themes = {
  light: { bg: '#E9E5DE', ink: '#17171A', muted: '#5A5552', rail: '#D5D0C9', red: '#BE2337' },
  dark: { bg: '#17171A', ink: '#E9E5DE', muted: '#B1AAA5', rail: '#363236', red: '#E34A5C' },
};
for (const [name, c] of Object.entries(themes)) {
  const bars = days.map((day, i) => {
    const height = day.contributionCount ? Math.max(3, day.contributionCount / max * 94) : 2;
    return `<rect x="${32 + i * 23}" y="${(166 - height).toFixed(2)}" width="15" height="${height.toFixed(2)}" fill="${day.contributionCount ? c.red : c.rail}"><title>${day.date}: ${day.contributionCount} contributions</title></rect>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="214" viewBox="0 0 780 214" role="img" aria-labelledby="title desc">
<title id="title">${total} contributions in the last 31 days</title>
<desc id="desc">DamianoCode's GitHub contribution counts, ${days[0].date} to ${days.at(-1).date}. Daily bars; maximum ${max}. Updated ${today} UTC.</desc>
<rect width="780" height="214" fill="${c.bg}"/>
<g font-family="ui-monospace, SFMono-Regular, Consolas, monospace">
<text x="32" y="38" font-size="22" font-weight="700" fill="${c.ink}">${total} contributions</text>
<text x="748" y="37" text-anchor="end" font-size="12" fill="${c.muted}">LAST 31 DAYS</text>
${bars}
<text x="32" y="193" font-size="11" fill="${c.muted}">${days[0].date}</text>
<text x="748" y="193" text-anchor="end" font-size="11" fill="${c.muted}">${days.at(-1).date} · UTC</text>
</g></svg>\n`;
  writeFileSync(`${assets}/activity-${name}.svg`, svg);
}
console.log(`Updated activity: ${total} contributions across ${days.length} days, ending ${days.at(-1).date}.`);
