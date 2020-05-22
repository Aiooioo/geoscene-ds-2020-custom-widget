import { useEffect, useRef, useState } from 'react';
import { connect } from 'dva';
import classes from 'classnames';
import esriLoader from 'esri-loader';
import useForceRender from './useUpdate';
import ListItem from './ListItem';

import styles from './index.less';

let widgetId = 'legend-layer-list-widget';

function closeItemActions(item) {
  const { actionsOpen, children } = item;

  if (actionsOpen) {
    item.actionsOpen = false;
  }

  children.forEach((child) => closeItemActions(child));
}

const LegendLayerList = ({ app, style }) => {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionEnabled, setSelectionEnabled] = useState(true);
  const [errorsVisible, setErrorVisible] = useState(true);
  const vmRef = useRef();
  const watchRef = useRef();
  const itemHandlerRef = useRef();
  const handlersRef = useRef([]);
  // const scheduleRender = useForceRender();

  function scheduleRender() {
    setItems(
      vmRef.current.operationalItems.toArray().filter((item) => errorsVisible || !item.error),
    );
  }

  function _renderOnItemChanges(item) {
    const itemId = item.uid;
    const registryKey = `items${itemId}`;
    itemHandlerRef.current.add(
      [
        watchRef.current.init(
          item,
          [
            'actionsOpen',
            'visible',
            'open',
            'updating',
            'title',
            'visibleAtCurrentScale',
            'error',
            'visibilityMode',
            'panel',
            'panel.title',
            'panel.content',
            'panel.className',
          ],
          () => scheduleRender(),
        ),
        item.actionsSections.on('change', () => scheduleRender()),
        item.children.on('change', () => scheduleRender()),
      ],
      registryKey,
    );

    item.children.forEach((child) => _renderOnItemChanges(child));
    item.actionsSections.forEach((actionSection) => {
      // _watchActionSectionChanges(actionSection, itemId);
    });
  }

  function _itemsChanged() {
    if (itemHandlerRef.current) itemHandlerRef.current.removeAll();

    vmRef.current.operationalItems.forEach((item) => _renderOnItemChanges(item));

    // scheduleRender
    setItems(
      vmRef.current.operationalItems.toArray().filter((item) => errorsVisible || !item.error),
    );
  }

  useEffect(() => {
    if (app.viewLoaded) {
      esriLoader
        .loadModules([
          'esri/core/Handles',
          'esri/widgets/LayerList/LayerListViewModel',
          'esri/core/watchUtils',
        ])
        .then(([Handles, LayerListViewModel, watchUtils]) => {
          watchRef.current = watchUtils;
          vmRef.current = new LayerListViewModel();
          itemHandlerRef.current = new Handles();
          handlersRef.current.push(
            watchUtils.on(vmRef.current, 'operationalItems', 'change', _itemsChanged),
          );
          vmRef.current.view = window.agsGlobal.view;
          setItems(
            vmRef.current.operationalItems.toArray().filter((item) => errorsVisible || !item.error),
          );
        });
    }

    return () => {
      if (itemHandlerRef.current) {
        itemHandlerRef.current.destroy();
        itemHandlerRef.current = null;
      }
    };
  }, [app.viewLoaded, errorsVisible]);

  const vmState = vmRef.current && vmRef.current.state;
  const baseClasses = {
    [styles.disabled]: vmState === 'disabled',
  };

  return (
    <div className={classes(styles.legend, baseClasses)} style={style}>
      {items.length === 0 ? (
        <div className={styles.noop}>没有可以显示的内容</div>
      ) : (
        <ul
          role="listbox"
          className={classes(styles.list, styles.listRoot, styles.listIndependent)}
        >
          {items.map((item, index) => {
            return (
              <ListItem
                key={item.id}
                widgetId={widgetId}
                item={item}
                loading={item.updating}
                parent={null}
                displayIndex={items.length - 1 - index}
                selectionEnabled={selectionEnabled}
                selectedItems={selectedItems}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default connect(({ app }) => {
  return {
    app,
  };
})(LegendLayerList);
