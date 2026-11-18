'use client';

import { useEffect } from 'react';

type ServiceWorkerRegistrarProps = {
  basePath: string;
};

// The base path has to arrive as a prop: `process.env.BASE_PATH` is not inlined
// into a client bundle, only `NEXT_PUBLIC_*` is.
export function ServiceWorkerRegistrar({ basePath }: ServiceWorkerRegistrarProps) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register(`${basePath}/sw.js`, basePath ? { scope: basePath } : undefined);
      } catch (error) {
        console.warn('Service worker registration failed', error);
      }
    };

    // Registering before `load` would compete with the page's own resources, so
    // wait for it — but hydration can finish after `load` already fired, and then
    // a listener added here would never run.
    if (document.readyState === 'complete') {
      void register();
      return;
    }

    window.addEventListener('load', register);

    return () => {
      window.removeEventListener('load', register);
    };
  }, [basePath]);

  return null;
}

export default ServiceWorkerRegistrar;
