import { useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import "@/styles/globals.css";

const TRACKING_ENDPOINT = "https://simpletrack-omega.vercel.app/api/visit";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendVisitTracking = async () => {
      try {
        const colorSchemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
        const browserNavigator = window.navigator as Navigator & {
          deviceMemory?: number;
          hardwareConcurrency?: number;
          connection?: {
            effectiveType?: string;
            type?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        };

        const getLocation = () =>
          new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
            if (!("geolocation" in navigator)) {
              resolve(null);
              return;
            }

            navigator.geolocation.getCurrentPosition(
              (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
              () => resolve(null),
              { timeout: 5000, maximumAge: 60000 }
            );
          });

        const location = await getLocation();
        const userAgent = browserNavigator.userAgent || "";
        const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
        const isTablet = /iPad|Tablet/i.test(userAgent);
        const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";
        const connection = browserNavigator.connection;

        const payload = {
          page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
          user_agent: userAgent,
          language: window.navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          screen_size: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          resolution: `${window.screen.width}x${window.screen.height}`,
          color_scheme: colorSchemeMedia.matches ? "dark" : "light",
          touch_support: window.navigator.maxTouchPoints > 0,
          device_memory: browserNavigator.deviceMemory ?? null,
          hardware_concurrency: browserNavigator.hardwareConcurrency ?? null,
          device_type: deviceType,
          location: location ? `${location.latitude},${location.longitude}` : null,
          latitude: location?.latitude ?? null,
          lattitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          network: connection
            ? {
                effective_type: connection.effectiveType ?? null,
                type: connection.type ?? null,
                downlink: connection.downlink ?? null,
                rtt: connection.rtt ?? null,
                save_data: connection.saveData ?? null,
              }
            : null,
          referrer: document.referrer || null,
        };

        await fetch(TRACKING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (error) {
        console.warn("Visit tracking failed", error);
      }
    };

    void sendVisitTracking();
  }, [router.asPath]);

  return <Component {...pageProps} />;
}
