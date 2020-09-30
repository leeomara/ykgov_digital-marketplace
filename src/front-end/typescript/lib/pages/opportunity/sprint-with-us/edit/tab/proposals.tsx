import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, immutable, Immutable, Init,  mapComponentDispatch, toast, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
import * as opportunityToasts from 'front-end/lib/pages/opportunity/sprint-with-us/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header';
import { swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Link, { iconLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { canSWUOpportunityBeAwarded, canViewSWUOpportunityProposals, hasSWUOpportunityPassedCodeChallenge, isSWUOpportunityAcceptingProposals, SWUOpportunity, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { canSWUProposalBeAwarded, compareSWUProposalsForPublicSector, getSWUProponentName, NUM_SCORE_DECIMALS, SWUProposalSlim, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { ADT, adt, Id } from 'shared/lib/types';

type ModalId
  = ADT<'award', Id>;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  awardLoading: Id | null;
  canProposalsBeAwarded: boolean;
  canViewProposals: boolean;
  proposals: SWUProposalSlim[];
  table: Immutable<Table.State>;
}

export type InnerMsg
  = ADT<'table', Table.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'award', Id>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  const canViewProposals = canViewSWUOpportunityProposals(params.opportunity);
  let proposals: SWUProposalSlim[] = [];
  if (canViewProposals) {
    const proposalResult = await api.proposals.swu.readMany(params.opportunity.id);
    proposals = api
      .getValidValue(proposalResult, [])
      .sort((a, b) => compareSWUProposalsForPublicSector(a, b, 'totalScore'));
  }
  // Can be screened in if...
  // - Opportunity has the appropriate status; and
  // - At least one proposal has been evaluated.
  const canProposalsBeAwarded = canSWUOpportunityBeAwarded(params.opportunity) && proposals.reduce((acc, p) =>
    acc || canSWUProposalBeAwarded(p),
    false as boolean
  );
  return {
    awardLoading: null,
    showModal: null,
    canViewProposals: canViewProposals && !! proposals.length,
    canProposalsBeAwarded,
    proposals,
    table: immutable(await Table.init({
      idNamespace: 'proposal-table'
    })),
    ...params
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'award':
      state = state.set('showModal', null);
      return [
        state.set('awardLoading', msg.value),
        async (state, dispatch) => {
          state = state.set('awardLoading', null);
          const updateResult = await api.proposals.swu.update(msg.value, adt('award', ''));
          switch (updateResult.tag) {
            case 'valid':
              dispatch(toast(adt('success', opportunityToasts.statusChanged.success(SWUOpportunityStatus.Awarded))));
              return immutable(await init({
                opportunity: api.getValidValue(await api.opportunities.swu.readOne(state.opportunity.id), state.opportunity),
                viewerUser: state.viewerUser
              }));
            case 'invalid':
            case 'unhandled':
              dispatch(toast(adt('error', opportunityToasts.statusChanged.error(SWUOpportunityStatus.Awarded))));
              return state;
          }
      }];

    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

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

const NotAvailable: ComponentView<State, Msg> = ({ state }) => {
  if (isSWUOpportunityAcceptingProposals(state.opportunity)) {
    return (<div>Proposals will be displayed here once this opportunity has closed.</div>);
  } else {
    return (<div>No proposals were submitted to this opportunity.</div>);
  }
};

const ContextMenuCell: View<{ disabled: boolean; loading: boolean; proposal: SWUProposalSlim; dispatch: Dispatch<Msg>; }> = ({ disabled, loading, proposal, dispatch }) => {
  switch (proposal.status) {
    case SWUProposalStatus.EvaluatedTeamScenario:
    case SWUProposalStatus.NotAwarded:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol('award'))}
          color='primary'
          size='sm'
          disabled={disabled || loading}
          loading={loading}
          onClick={() => dispatch(adt('showModal', adt('award' as const, proposal.id))) }>
          Award
        </Link>
      );
    default:
      return null;
  }
};

interface ProponentCellProps {
  proposal: SWUProposalSlim;
  opportunity: SWUOpportunity;
  disabled: boolean;
}

const ProponentCell: View<ProponentCellProps> = ({ proposal, opportunity, disabled }) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: opportunity.id,
    tab: 'proposal' as const
  };
  return (
    <div>
      <Link disabled={disabled} dest={routeDest(adt('proposalSWUView', proposalRouteParams))}>{getSWUProponentName(proposal)}</Link>
      {(() => {
        if (!proposal.organization) { return null; }
        return (
          <div className='small text-secondary text-uppercase'>
            {proposal.anonymousProponentName}
          </div>
        );
      })()}
    </div>
  );
};

function evaluationTableBodyRows(state: Immutable<State>, dispatch: Dispatch<Msg>): Table.BodyRows  {
  const isAwardLoading = !!state.awardLoading;
  const isLoading = isAwardLoading;
  return state.proposals.map(p => {
    const isProposalLoading = state.awardLoading === p.id;
    return [
      {
        className: 'text-wrap',
        children: (
          <ProponentCell
            proposal={p}
            opportunity={state.opportunity}
            disabled={isLoading} />
        )
      },
      { children: (<Badge text={swuProposalStatusToTitleCase(p.status, state.viewerUser.type)} color={swuProposalStatusToColor(p.status, state.viewerUser.type)} />) },
      {
        className: 'text-center',
        children: (<div>{p.questionsScore ? `${p.questionsScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      },
      {
        className: 'text-center',
        children: (<div>{p.challengeScore ? `${p.challengeScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      },
      {
        className: 'text-center',
        children: (<div>{p.scenarioScore ? `${p.scenarioScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      },
      {
        className: 'text-center',
        children: (<div>{p.priceScore ? `${p.priceScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      },
      {
        className: 'text-center',
        children: (<div>{p.totalScore ? `${p.totalScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      },
      ...(state.canProposalsBeAwarded
        ? [{
            showOnHover: !isProposalLoading,
            className: 'text-right text-nowrap',
            children: (<ContextMenuCell dispatch={dispatch} proposal={p} disabled={isLoading} loading={isProposalLoading} />)
          }]
        : [])
    ];
  });
}

function evaluationTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Proponent',
      className: 'text-nowrap',
      style: { width: '100%', minWidth: '200px' }
    },
    {
      children: 'Status',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'TQ',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    {
      children: 'CC',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    {
      children: 'TS',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    {
      children: 'Price',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    {
      children: 'Total',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    ...(state.canProposalsBeAwarded
      ? [{
          children: '',
          className: 'text-nowrap text-right',
          style: { width: '0px' }
        }]
      : [])
  ];
}

const Scoresheet: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Table.view
      headCells={evaluationTableHeadCells(state)}
      bodyRows={evaluationTableBodyRows(state, dispatch)}
      state={state.table}
      dispatch={mapComponentDispatch(dispatch, msg => adt('table' as const, msg))} />
  );
};

const makeCardData = (opportunity: SWUOpportunity, proposals: SWUProposalSlim[]): ReportCard[]  => {
  const numProposals = opportunity.reporting?.numProposals || 0;
  const [highestScore, averageScore] = proposals.reduce(([highest, average], { totalScore }, i) => {
    if (!totalScore) { return [highest, average]; }
    return [
      totalScore > highest ? totalScore : highest,
      (average * i + totalScore) / (i + 1)
    ];
  }, [0, 0]);
  const isAwarded = opportunity.status === SWUOpportunityStatus.Awarded;
  return [
    {
      icon: 'comment-dollar',
      name: `Proposal${numProposals === 1 ? '' : 's'}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: 'star-full',
      iconColor: 'c-report-card-icon-highlight',
      name: 'Top Score',
      value: isAwarded && highestScore ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    },
    {
      icon: 'star-half',
      iconColor: 'c-report-card-icon-highlight',
      name: 'Avg. Score',
      value: isAwarded && averageScore ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    }
  ];
};

const view: ComponentView<State, Msg> = (props) => {
  const { state } = props;
  const opportunity = state.opportunity;
  const cardData = makeCardData(opportunity, state.proposals);
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={state.viewerUser} />
      <Row className='mt-5'>
        <Col xs='12'>
          <ReportCardList reportCards={cardData} />
        </Col>
      </Row>
      <div className='border-top mt-5 pt-5'>
        <Row>
          <Col xs='12' className='d-flex flex-column flex-md-row justify-content-md-between align-items-start align-items-md-center mb-4'>
            <h4 className='mb-0'>Proposals</h4>
            {state.canViewProposals && hasSWUOpportunityPassedCodeChallenge(opportunity)
              ? (<Link
                  newTab
                  color='info'
                  className='mt-3 mt-md-0'
                  symbol_={rightPlacement(iconLinkSymbol('file-export'))}
                  dest={routeDest(adt('proposalSWUExportAll', { opportunityId: opportunity.id, anonymous: false }))}>
                  Export All Proposals
                </Link>)
              : null}
          </Col>
          <Col xs='12'>
            {state.canViewProposals && state.proposals.length
              ? (<Scoresheet {...props} />)
              : (<NotAvailable {...props} />)}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'award':
        return {
          title: 'Award Sprint With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Award Opportunity',
              icon: 'award',
              color: 'primary',
              button: true,
              msg: adt('award', state.showModal.value)
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to award this opportunity to this proponent? Once awarded, all subscribers and proponents will be notified accordingly.'
        };
    }
  }
};
