import { useInterval } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import { useState } from 'react';

export function ScreenPreview(props: { name: string }) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  useInterval(
    async (name) => {
      if (!name) {
        setScreenshot(null);
        return;
      }

      const screenshot = await client.vm.screenshot.query({ name });
      setScreenshot(screenshot);
    },
    1000,
    props.name
  );
  return (
    <>
      {screenshot ? (
        <img
          src={screenshot}
          alt="Screenshot"
          className="max-h-full max-w-full flex-shrink flex-grow"
        />
      ) : (
        ''
      )}
    </>
  );
}
