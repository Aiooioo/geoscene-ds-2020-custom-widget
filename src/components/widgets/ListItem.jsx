import { useRef } from 'react';
import {
  FullscreenOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Menu, Icon, Dropdown } from 'antd';
import classnames from 'classnames';
import esriLoader from 'esri-loader';
import { connect } from 'dva';
import dragSrc from './images/drag-move-fill.png';

import styles from './index.less';

const ListItem = ({
  widgetId,
  item,
  parent,
  loading,
  displayIndex,
  selectionEnabled,
  selectedItems,
  dispatch,
}) => {
  const itemRef = useRef(null);

  /**
   * 使用自定义的actions面板来替代原生的
   */
  function _renderCustomActions(item) {
    const menu = (
      <Menu
        className={styles.cActionsMenu}
        onClick={(e) => {
          const { key, domEvent } = e;
          domEvent.stopPropagation();

          switch (key) {
            case 'remove': {
              if (item.layer) {
                window.agsGlobal.view.map.remove(item.layer);
              }
              break;
            }
            case 'full': {
              break;
            }
            case 'moveup': {
              if (item.layer) {
                if (parent) {
                  if (parent.layer && parent.layer.type === 'group') {
                    parent.layer.layers.reorder(item.layer, displayIndex + 1);
                  }
                } else {
                  window.agsGlobal.view.map.layers.reorder(item.layer, displayIndex + 1);
                }
              }
              break;
            }
            case 'movedown': {
              if (displayIndex === 0) return;

              if (item.layer) {
                if (parent) {
                  if (parent.layer && parent.layer.type === 'group') {
                    parent.layer.layers.reorder(item.layer, displayIndex - 1);
                  }
                } else {
                  window.agsGlobal.view.map.layers.reorder(item.layer, displayIndex - 1);
                }
              }
              break;
            }
            default:
              break;
          }
        }}
      >
        <Menu.Item key="full" style={{ width: 90 }}>
          <a href="#">
            <FullscreenOutlined style={{ color: 'lightgreen', marginRight: 8 }} />
            缩放至
          </a>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="moveup" style={{ width: 90 }}>
          <a href="#">
            <ArrowUpOutlined style={{ color: 'lightgreen', marginRight: 8 }} />
            上移
          </a>
        </Menu.Item>
        <Menu.Item key="movedown" style={{ width: 90 }}>
          <a href="#">
            <ArrowDownOutlined style={{ color: 'lightgreen', marginRight: 8 }} />
            下移
          </a>
        </Menu.Item>
        <Menu.Item key="remove" style={{ width: 90 }}>
          <a href="#">
            <CloseOutlined style={{ color: 'red', marginRight: 8 }} />
            移除
          </a>
        </Menu.Item>
      </Menu>
    );

    return (
      <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
        <a href="#" className={styles.cActionsIcon}>
          <UnorderedListOutlined />
        </a>
      </Dropdown>
    );
  }

  function _renderPanelButton(panel) {
    const { className, open, title, image } = panel;
    const actionClass = !image && !className ? styles.iconDefaultAction : className;
    const iconStyles = _getIconImageStyles(panel);
    const buttonClasses = {};
    const iconClasses = {};
    if (actionClass) {
      iconClasses[actionClass] = !!actionClass;
    }

    return (
      <div data-panel={panel}>
        <span className={classnames(iconClasses)} style={iconStyles}></span>
      </div>
    );
  }

  function _getIconImageStyles(source) {
    const image =
      source.declaredClass === 'esri.widgets.LayerList.ListItemPanel' ||
      source.declaredClass === 'esri.support.Action.ActionButton' ||
      source.declaredClass === 'esri.support.Action.ActionToggle'
        ? source.image
        : null;
    return {
      backgroundImage: image ? `url("${image}")` : null,
    };
  }

  function _createLabelNode(item, parent, titleKey) {
    const parentVisibilityMode = parent && parent.visibilityMode;

    const toggleIconClasses = {
      ['esri-icon-radio-checked']: parentVisibilityMode === 'exclusive' && item.visible,
      ['esri-icon-radio-unchecked']: parentVisibilityMode === 'exclusive' && !item.visible,
      ['esri-icon-visible']: parentVisibilityMode !== 'exclusive' && item.visible,
      ['esri-icon-non-visible']: parentVisibilityMode !== 'exclusive' && !item.visible,
    };
    const toggleRole = parentVisibilityMode === 'exclusive' ? 'radio' : 'switch';
    const title = item.title || '未命名的图层';
    const label = !item.visibleAtCurrentScale ? `${title} (当前比例尺下不可见)` : title;
    const titleNode = (
      <span id={titleKey} title={label} className={styles.title}>
        {title}
      </span>
    );
    const visibilityIconNode = (
      <span className={classnames(styles.toggleVisibleIcon, toggleIconClasses)} />
    );

    const toggleProps = {
      // 'data-item': item,
      onClick: (e) => {
        if (!(parentVisibilityMode === 'exclusive' && item.visible)) {
          item.visible = !item.visible;
        }

        e.stopPropagation();
      },
      'data-parent-visibility': parentVisibilityMode,
      tabIndex: 0,
      role: toggleRole,
      'aria-checked': item.visible ? 'true' : 'false',
    };
    const noToggleProps = {};
    const iconProps = selectionEnabled ? toggleProps : noToggleProps;
    const labelProps = selectionEnabled ? noToggleProps : toggleProps;
    const labelNode = (
      <div className={styles.label} {...labelProps}>
        <span className={styles.toggleVisible} {...iconProps}>
          {visibilityIconNode}
        </span>
        {titleNode}
      </div>
    );
    const hasError = !!item.error;
    const errorIconNode = hasError ? <span className="esri-icon-notice-triangle" /> : null;
    return parentVisibilityMode === 'inherited' || hasError ? (
      <div className={styles.label}>
        {errorIconNode}
        {titleNode}
      </div>
    ) : (
      labelNode
    );
  }

  function _countActions(actionSections) {
    return actionSections.reduce((count, section) => count + section.length, 0);
  }

  function _getSingleActionButton(item) {
    return item.actionsSections
      .reduce((item) => item)
      .filter((item) => item && item.type === 'button')
      .getItemAt(0);
  }

  function _renderAction({ item, action, singleAction }) {
    const iconStyles = _getIconImageStyles(action);

    const { active, className, disabled, title } = action;
    const actionClass =
      action.type === 'button' && !action.image && !className
        ? 'esri-icon-default-action'
        : className;
    const buttonClasses = {};
    const iconClasses = {};
    if (actionClass) {
      iconClasses[actionClass] = true;
    }
    const iconNode = (
      <span className={classnames(styles.actionIcon, iconClasses)} style={iconStyles}></span>
    );
    const titleNode = !singleAction ? <span className={styles.actionTitle}>{title}</span> : null;
    const actionContentNodes = [iconNode, titleNode];
    if (singleAction) {
      return (
        <div
          data-item={item}
          data-action={action}
          role="button"
          className={classnames(buttonClasses)}
          tabIndex="0"
          title={title}
        >
          {actionContentNodes}
        </div>
      );
    }

    return (
      <li
        data-item={item}
        data-action={action}
        className={classnames(buttonClasses)}
        tabIndex="0"
        role="button"
        title={title}
      >
        {actionContentNodes}
      </li>
    );
  }

  function _renderActionSection(item, actionSection) {
    const actionSectionArray = actionSection && actionSection.toArray();
    return actionSectionArray.map((action) => _renderAction({ item, action }));
  }

  function _renderActionsSections(item, actionsSections, actionsUid) {
    const actionSectionsArray = actionsSections.toArray();
    const actionSection = actionSectionsArray.map((actionSection) => {
      return <ul className={styles.actionsList}>{_renderActionSection(item, actionSection)}</ul>;
    });

    return (
      <div
        role="group"
        id={actionsUid}
        className={styles.actions}
        hidden={item.actionsOpen ? null : true}
      >
        {actionSection}
      </div>
    );
  }

  function _renderItem(item, parent) {
    const uid = `${widgetId}_${item.uid}`;
    const actionsUid = `${uid}_actions`;
    const listUid = `${uid}__list`;
    const titleKey = `${uid}__title`;

    const childrenLen = item.children.length;
    const hasError = !!item.error;
    const hasChildren = !!childrenLen && !hasError;
    const errorMessage = hasError ? '存在错误' : '';
    const { visibilityMode } = item;
    const childItems = item.children && item.children.toArray();
    const childClasses = {
      [styles.listExclusive]: visibilityMode === 'exclusive',
      [styles.listInherited]: visibilityMode === 'inherited',
      [styles.listIndependent]: visibilityMode !== 'inherited' && visibilityMode !== 'exclusive',
    };
    const itemClasses = {
      [styles.itemChildren]: hasChildren,
      [styles.itemError]: !!hasError,
      [styles.itemUpdating]: item.updating && !parent,
      [styles.itemInvisibleAtScale]: !item.visibleAtCurrentScale,
      [styles.itemSelectable]: true,
    };
    const actionsCount = _countActions(item.actionsSections);
    const { panel } = item;
    const contentNode = panel && panel.open ? panel.render() : null;
    const contentActionNode = panel && panel.visible ? _renderPanelButton(panel) : null;
    const actionsMenuClasses = {
      [styles.actionsMenuItemActive]: item.actionsOpen,
    };
    const actionsMenuTitle = item.actionsOpen ? 'close' : 'open';

    const singleAction = actionsCount === 1 && _getSingleActionButton(item);
    const singleActionNode = singleAction
      ? _renderAction({ item, action: singleAction, singleAction: true })
      : null;
    const actionsMenuIcon =
      !singleAction && actionsCount ? (
        <div
          className={classnames(styles.actionsMenuItem, actionsMenuClasses)}
          tabIndex="0"
          role="button"
          title={actionsMenuTitle}
        >
          <span className="esri-icon-handle-horizontal"></span>
        </div>
      ) : null;
    const actionsMenu = _renderCustomActions(item);
    // const actionsMenu =
    //   actionsMenuIcon || contentActionNode || singleActionNode ? (
    //     <div className={styles.actionsMenu}>
    //       {contentActionNode}
    //       {singleActionNode}
    //       {actionsMenuIcon}
    //     </div>
    //   ) : null;
    // const actions = actionsCount
    //   ? _renderActionsSections(item, item.actionsSections, actionsUid)
    //   : null;

    const children = hasChildren ? (
      <ul
        id={listUid}
        className={classnames(styles.list, childClasses)}
        role={visibilityMode === 'exclusive' ? 'radiogroup' : 'group'}
        hidden={item.open ? null : true}
      >
        {childItems.map((childItem, index) => {
          return (
            <ListItem
              widgetId={widgetId}
              item={childItem}
              parent={item}
              displayIndex={childItems.length - 1 - index}
              selectionEnabled={selectionEnabled}
              selectedItems={selectedItems}
            />
          );
        })}
      </ul>
    ) : null;
    const childToggleClasses = {
      [styles.itemChildToggleOpen]: item.open,
    };
    const toggleChildrenTitle = item.open ? '收起' : '展开';
    const toggleChildren = hasChildren ? (
      <span
        onClick={(e) => {
          item.open = !item.open;

          e.stopPropagation();
        }}
        data-item={item}
        className={classnames(styles.childToggle, childToggleClasses)}
        tabIndex="0"
        role="button"
        title={toggleChildrenTitle}
      >
        <span className={classnames(styles.childClosed, 'esri-icon-right-triangle-arrow')} />
        <span className={classnames(styles.childOpened, 'esri-icon-down-arrow')} />
        <span className={classnames(styles.childClosed_RTL, 'esri-icon-left-triangle-arrow')} />
      </span>
    ) : null;
    const itemLabel = _createLabelNode(item, parent, titleKey);
    const errorBlock = hasError ? (
      <div className={styles.errorMsg} role="alert">
        <span>{errorMessage}</span>
      </div>
    ) : null;
    const isSelected = selectedItems.indexOf(item) > -1;
    const sortDataAttrValue = !parent ? item.get('layer.uid') : null;
    const listItemProps = selectionEnabled
      ? {
          // 'data-item': item,
          tabIndex: 0,
          'aria-selected': isSelected ? 'true' : 'false',
          role: 'option',
          'data-layer-uid': sortDataAttrValue,
        }
      : {};
    // const DragAnchor = DragSource(
    //   item.uid,
    //   {
    //     beginDrag(props) {
    //       return {};
    //     },
    //   },
    //   (connect, monitor) => {
    //     return {
    //       connectDragSource: connect.dragSource(),
    //       isDragging: monitor.isDragging(),
    //     };
    //   },
    // )(props => {
    //   return props.connectDragSource(
    //     <div
    //       style={{
    //         margin: '-2px 0 0 4px',
    //       }}
    //     >
    //       <img src={dragSrc} height={16} width={16} />
    //     </div>,
    //   );
    // });
    // const DropAnchorTop = DropTarget(
    //   item.uid + '_top',
    //   {
    //     drop(props, monitor) {
    //       props.onDrop({
    //         ...monitor.getItem(),
    //       });
    //     },
    //   },
    //   (connect, monitor) => {
    //     return {
    //       connectDropTarget: connect.dropTarget(),
    //       isOver: monitor.isOver(),
    //       canDrop: monitor.canDrop(),
    //     };
    //   },
    // )(({ connectDropTarget, isOver, canDrop, lastDroppedItem }) => {
    //   const isActive = isOver && canDrop;
    //   return connectDropTarget(
    //     <div>
    //       {isActive ? (
    //         <span
    //           style={{
    //             height: '40px',
    //             width: '100%',
    //             border: '1px dotted lightgreen',
    //           }}
    //         ></span>
    //       ) : null}
    //     </div>,
    //   );
    // });

    return (
      <li
        ref={itemRef}
        className={classnames(styles.item, itemClasses)}
        {...listItemProps}
        onClick={() => {
          dispatch({
            type: 'toolbar/updateSwipeLayer',
            payload: item.title,
          });
        }}
      >
        <div className={styles.itemContainer}>
          {toggleChildren}
          {itemLabel}
          {actionsMenu}
        </div>
        {errorBlock}
        {/*{actions}*/}
        {contentNode}
        {children}
      </li>
    );
  }

  return _renderItem(item, parent);
};

export default connect(({ toolbar }) => {
  return {
    toolbar,
  };
})(ListItem);
