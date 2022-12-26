import { component$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <p>Hello from Users!</p>
    </>
  );
});

export const head: DocumentHead = {
  title: 'System - Users',
};
