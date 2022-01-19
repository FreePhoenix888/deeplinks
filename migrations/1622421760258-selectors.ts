import { generateApolloClient } from '@deep-foundation/hasura/client';
import { sql } from '@deep-foundation/hasura/sql';
import Debug from 'debug';
import { DeepClient } from '../imports/client';
import { api, SCHEMA } from './1616701513782-links';
import { MP_TABLE_NAME } from './1621815803572-materialized-path';
import { BOOL_EXP_TABLE_NAME } from './1622421760250-values';
import { replaceSymbol } from '../imports/bool_exp';

const debug = Debug('deeplinks:migrations:selectors');

export const SELECTORS_TABLE_NAME = 'selectors';
export const TABLE_NAME = 'links';
export const BOOL_EXP_COMPUTED_FIELD = `${TABLE_NAME}__exec_bool_exp__function`;

const client = generateApolloClient({
  path: `${process.env.MIGRATIONS_HASURA_PATH}/v1/graphql`,
  ssl: !!+process.env.MIGRATIONS_HASURA_SSL,
  secret: process.env.MIGRATIONS_HASURA_SECRET,
});

const deep = new DeepClient({
  apolloClient: client,
})

export const up = async () => {
  debug('up');
  debug('view');
  await api.sql(sql`
    CREATE VIEW ${SELECTORS_TABLE_NAME} AS
    SELECT mp1."item_id" as "item_id", si_sr."id" as "selector_id", (
      SELECT "to_id" FROM ${TABLE_NAME} WHERE
      "type_id" = ${await deep.id('@deep-foundation/core', 'SelectorCriteria')} AND
      "from_id" = si_sr."id"
    ) as "bool_exp_id"
    FROM
    ${MP_TABLE_NAME} as mp1,
    ${TABLE_NAME} as up_si,
    ${TABLE_NAME} as si,
    ${TABLE_NAME} as si_t,
    ${TABLE_NAME} as si_sr
    WHERE
    mp1."path_item_id" = up_si."id" AND
    up_si."id" = si."to_id" AND
    si."type_id" = ${await deep.id('@deep-foundation/core', 'Include')} AND
    si."from_id" = si_sr."id" AND
    si_t."type_id" = ${await deep.id('@deep-foundation/core', 'SelectorTree')} AND
    si_t."from_id" = si."id" AND
    si_t."to_id" = mp1."group_id" AND
    si_sr."type_id" = ${await deep.id('@deep-foundation/core', 'Selector')} AND
    NOT EXISTS (
      SELECT mp2.*
      FROM
      ${TABLE_NAME} as si_sr_se,
      ${TABLE_NAME} as si_sr_se_t,
      ${TABLE_NAME} as up_se,
      ${MP_TABLE_NAME} as mp2
      WHERE
      si_sr_se."type_id" = ${await deep.id('@deep-foundation/core', 'Exclude')} AND
      si_sr_se."from_id" = si_sr."id" AND
      si_sr_se."to_id" = up_se."id" AND
      si_sr_se_t."type_id" = ${await deep.id('@deep-foundation/core', 'SelectorTree')} AND
      si_sr_se_t."from_id" = si_sr_se."id" AND
      si_sr_se_t."to_id" = mp2."group_id" AND
      up_se."id" = mp2."path_item_id" AND
      mp1."item_id" = mp2."item_id"
    );
  `);
  await api.sql(sql`
    CREATE OR REPLACE FUNCTION bool_exp_execute(target_link_id bigint, bool_exp_link_id bigint) RETURNS BOOL AS $trigger$ DECLARE
      boolExp RECORD;
      sqlResult INT;
    BEGIN
      SELECT be.* into boolExp
      FROM "${BOOL_EXP_TABLE_NAME}" as be
      WHERE be.link_id=bool_exp_link_id;
      IF boolExp IS NOT NULL THEN
        EXECUTE (SELECT REPLACE(boolExp.value, '${replaceSymbol}', target_link_id::text)) INTO sqlResult;
        IF sqlResult = 0 THEN
          RETURN FALSE;
        END IF;
        RETURN TRUE;
      END IF;
      RETURN NULL;
    END; $trigger$ LANGUAGE plpgsql;
  `);
  await api.sql(sql`CREATE OR REPLACE FUNCTION ${BOOL_EXP_COMPUTED_FIELD}(link ${TABLE_NAME}, link_id bigint) RETURNS BOOL STABLE AS $function$ DECLARE RESULT BOOL;
  BEGIN
    SELECT INTO RESULT bool_exp_execute(link_id, link.id);
    RETURN RESULT;
  END; $function$ LANGUAGE plpgsql;`);
  await api.query({
    type: 'add_computed_field',
    args: {
      table: TABLE_NAME,
      source: 'default',
      name: 'exec_bool_exp',
      definition:{
        function:{
          name: BOOL_EXP_COMPUTED_FIELD,
          schema: 'public',
        },
        table_argument: 'link',
      }
    },
  });
  await api.query({
    type: 'track_table',
    args: {
      schema: SCHEMA,
      name: SELECTORS_TABLE_NAME,
    },
  });
  await api.query({
    type: 'create_object_relationship',
    args: {
      table: SELECTORS_TABLE_NAME,
      name: 'selector',
      using: {
        manual_configuration: {
          remote_table: {
            schema: SCHEMA,
            name: TABLE_NAME,
          },
          column_mapping: {
            selector_id: 'id',
          },
          insertion_order: 'before_parent',
        },
      },
    },
  });
  await api.query({
    type: 'create_object_relationship',
    args: {
      table: SELECTORS_TABLE_NAME,
      name: 'item',
      using: {
        manual_configuration: {
          remote_table: {
            schema: SCHEMA,
            name: TABLE_NAME,
          },
          column_mapping: {
            item_id: 'id',
          },
          insertion_order: 'before_parent',
        },
      },
    },
  });
  await api.query({
    type: 'create_array_relationship',
    args: {
      table: SELECTORS_TABLE_NAME,
      name: 'bool_exp',
      using: {
        manual_configuration: {
          remote_table: {
            schema: SCHEMA,
            name: TABLE_NAME,
          },
          column_mapping: {
            bool_exp_id: 'id',
          },
          insertion_order: 'after_parent',
        },
      },
    },
  });
  await api.query({
    type: 'create_array_relationship',
    args: {
      table: TABLE_NAME,
      name: 'selectors',
      using: {
        manual_configuration: {
          remote_table: {
            schema: SCHEMA,
            name: SELECTORS_TABLE_NAME,
          },
          column_mapping: {
            id: 'item_id',
          },
          insertion_order: 'after_parent',
        },
      },
    },
  });
  await api.query({
    type: 'create_array_relationship',
    args: {
      table: TABLE_NAME,
      name: 'selected',
      using: {
        manual_configuration: {
          remote_table: {
            schema: SCHEMA,
            name: SELECTORS_TABLE_NAME,
          },
          column_mapping: {
            id: 'selector_id',
          },
          insertion_order: 'after_parent',
        },
      },
    },
  });
};

export const down = async () => {
  debug('down');
  debug('view');
  await api.query({
    type: 'untrack_table',
    args: {
      table: {
        schema: SCHEMA,
        name: SELECTORS_TABLE_NAME,
      },
      cascade: true,
    },
  });
  await api.sql(sql`
    DROP VIEW IF EXISTS ${SELECTORS_TABLE_NAME} CASCADE;
  `);
  await api.query({
    type: 'drop_computed_field',
    args: {
      table: TABLE_NAME,
      source: 'default',
      name: BOOL_EXP_COMPUTED_FIELD,
      cascade: false,
    },
  });
  await api.sql(sql`
    DROP FUNCTION IF EXISTS bool_exp_execute CASCADE;
  `);
};