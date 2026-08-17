export const SITE_ICP_RECORD = '闽ICP备2026030723号';
export const SITE_ICP_URL = 'https://beian.miit.gov.cn/';

export function SiteComplianceLink({ placement }: { placement: 'floating' | 'sidebar' }) {
  return (
    <a
      className={`site-compliance-link ${placement}`}
      href={SITE_ICP_URL}
      target="_blank"
      rel="noreferrer"
      data-testid="site-icp-link"
      aria-label={`${SITE_ICP_RECORD}，前往工信部备案系统`}
    >
      {SITE_ICP_RECORD}
    </a>
  );
}
