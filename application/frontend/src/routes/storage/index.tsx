import { component$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <p>Hello from Storage!</p>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Storage',
};
