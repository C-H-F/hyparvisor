import { component$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <h1>License</h1>
      <p>
        Icons used: Adwaita from "GNOME Project". LGPL v3 <br />
        <a href="https://github.com/GNOME/adwaita-icon-theme" target="_blank">
          https://github.com/GNOME/adwaita-icon-theme
        </a>
      </p>
      <p>
        Server Image: panumas nikhomkhai @ Pexels: <br />
        <a
          href="https://www.pexels.com/de-de/foto/nahaufnahme-foto-von-mining-rig-1148820/"
          target="_blank"
        >
          https://www.pexels.com/de-de/foto/nahaufnahme-foto-von-mining-rig-1148820/
        </a>
      </p>
    </>
  );
});

export const head: DocumentHead = {
  title: 'License',
};
