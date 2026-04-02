import { Suspense } from 'react'
import Script from 'next/script'
import { GoogleAnalyticsPageTracker } from './google-analytics-page-tracker'

function getOptionalEnv(value: string | undefined) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}

const gaMeasurementId = getOptionalEnv(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
const clarityProjectId = getOptionalEnv(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID)

export function MonitoringScripts() {
  return (
    <>
      {gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}', { send_page_view: false });`}
          </Script>
          <Suspense fallback={null}>
            <GoogleAnalyticsPageTracker measurementId={gaMeasurementId} />
          </Suspense>
        </>
      ) : null}

      {clarityProjectId ? (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${clarityProjectId}");`}
        </Script>
      ) : null}
    </>
  )
}
