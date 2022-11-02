import { component$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <h1>License</h1>
      <p>Icons used: Adwaita from "GNOME Project". LGPL v3</p>
      <p>
        Server Image: panumas nikhomkhai @ Pexels:
        https://www.pexels.com/de-de/foto/nahaufnahme-foto-von-mining-rig-1148820/
      </p>
    </>
  );
});

export const head: DocumentHead = {
  title: 'License',
};
