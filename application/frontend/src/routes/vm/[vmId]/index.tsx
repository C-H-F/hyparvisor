import { component$ } from '@builder.io/qwik';
import { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ request, response }) => {
  //TODO: Find a better solution to redirect.
  throw response.redirect(request.url.replace('/vm/', '/vm/show/'));
};
