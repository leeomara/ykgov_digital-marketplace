import { EMPTY_STRING } from 'front-end/config';
import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareStrings } from 'shared/lib';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';

type TableOrganization = OrganizationSlim;

export interface State {
  table: Immutable<Table.State>;
  organizations: TableOrganization[];
  sessionUser: User | null;
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

async function baseState(): Promise<State> {
  return {
    organizations: [],
    table: immutable(await Table.init({
      idNamespace: 'org-list-table'
    })),
    sessionUser: null
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ shared }) => {
  const result = await api.organizations.readMany();
  if (!api.isValid(result)) {
    return await baseState();
  }
  return {
    ...(await baseState()),
    sessionUser: shared.session && shared.session.user,
    organizations: result.value
      .sort((a, b) => compareStrings(a.legalName, b.legalName))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'table', value })
      });
    default:
      return [state];
  }
};

function showOwnerColumn(state: Immutable<State>): boolean {
  return !!state.sessionUser && state.sessionUser.type !== UserType.Government;
}

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  const owner = {
    children: 'Owner',
    className: 'text-nowrap',
    style: {
      minWidth: '200px'
    }
  };
  return [
    {
      children: 'Organization Name',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '240px'
      }
    },
    ...(showOwnerColumn(state) ? [owner] : [])
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.organizations.map(org => {
    const owner = {
      className: 'text-nowrap',
      children: org.owner
        ? (<Link dest={routeDest(adt('userProfile', { userId: org.owner.id }))}>{org.owner.name}</Link>)
        : EMPTY_STRING
    };
    return [
      {
        children: org.owner
          ? (<Link dest={routeDest(adt('orgEdit', { orgId: org.id })) }>{org.legalName}</Link>)
          : org.legalName
      },
      ...(showOwnerColumn(state) ? [owner] : [])
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
      <h1 className='mb-5'>Digital Marketplace Organizations</h1>
      <Row>
        <Col xs='12'>
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={dispatchTable} />
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Organizations');
  },
  getContextualActions: ({ state, dispatch }) => {
    if (!state.sessionUser || !isVendor(state.sessionUser)) { return null; }
    return adt('links', [
      {
        children: 'Create Organization',
        button: true,
        symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
        color: 'primary',
        dest: routeDest(adt('orgCreate', null))
      },
      {
        children: 'My Organizations',
        button: true,
        outline: true,
        symbol_: leftPlacement(iconLinkSymbol('building')),
        color: 'c-nav-fg-alt',
        dest: routeDest(adt('userProfile', {
          userId: state.sessionUser.id,
          tab: 'organizations' as const
        }))
      }
    ]);
  }
};
