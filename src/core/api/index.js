/* global fetch */

import url from 'url';

import 'isomorphic-fetch';
import { Schema, arrayOf, normalize } from 'normalizr';
import config from 'config';

const API_BASE = `${config.get('apiHost')}${config.get('apiPath')}`;

export const addon = new Schema('addons', { idAttribute: 'slug' });
export const user = new Schema('users', { idAttribute: 'username' });

function makeQueryString(query) {
  return url.format({ query });
}

export function callApi({ endpoint, schema, params = {}, auth = false, state = {}, method = 'get',
                         body, credentials }) {
  const queryString = makeQueryString({ ...params, lang: state.lang });
  const options = {
    headers: {},
    method,
  };
  if (credentials) {
    options.credentials = 'include';
  }
  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-type'] = 'application/json';
  }
  if (auth) {
    if (state.token) {
      options.headers.authorization = `Bearer ${state.token}`;
    }
  }
  const apiURL = `${API_BASE}/${endpoint}/${queryString}`;

  return fetch(apiURL, options)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }

      // If response is not ok we'll throw.
      // Notes that redux-connect will catch this exception and
      // pass it up to the state as an error for this api call.
      const apiError = new Error('Error calling API');
      apiError.response = {
        apiURL,
        status: response.status,
      };
      throw apiError;
    })
    .then((response) => (schema ? normalize(response, schema) : response));
}

export function search({ api, page, query }) {
  // TODO: Get the language from the server.
  return callApi({
    endpoint: 'internal/addons/search',
    schema: { results: arrayOf(addon) },
    params: { q: query, page },
    state: api,
    auth: true,
  });
}

export function fetchAddon({ api, slug }) {
  return callApi({
    endpoint: `addons/addon/${slug}`,
    schema: addon,
    auth: true,
    state: api,
  });
}

export function login({ api, code, state }) {
  return callApi({
    endpoint: 'internal/accounts/login',
    method: 'post',
    body: { code, state },
    state: api,
    credentials: true,
  });
}

export function startLoginUrl() {
  return `${API_BASE}/internal/accounts/login/start/`;
}

export function fetchProfile({ api }) {
  return callApi({
    endpoint: 'accounts/profile',
    schema: user,
    auth: true,
    state: api,
  });
}
