import { component$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Terminal from '~/components/terminal/terminal';

export default component$(() => {
  return (
    <>
      <p>Hello from System!</p>
      <Terminal />
    </>
  );
});

export const head: DocumentHead = {
  title: 'System',
};
