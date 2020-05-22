import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'umi';
import { Switch } from 'antd';
import esriLoader from 'esri-loader';
import LegendLayerList from '@/components/widgets/LayerList';
import styles from './index.css';

export default connect(({ app }) => ({ app }))(function ({ dispatch, app }) {
  const domRef = useRef();
  const viewRef = useRef();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    esriLoader
      .loadModules(['esri/Map', 'esri/views/SceneView', 'esri/widgets/LayerList'])
      .then(([EsriMap, SceneView, LayerList]) => {
        const map = new EsriMap({
          basemap: 'streets-night-vector',
        });
        viewRef.current = new SceneView({
          container: domRef.current,
          map,
          center: [116.4, 39.9],
          zoom: 10,
        });

        viewRef.current.when(() => {
          const ll = new LayerList({
            view: viewRef.current,
          });

          viewRef.current.ui.add(ll, {
            position: 'bottom-right',
          });

          window.agsGlobal = {
            view: viewRef.current,
          };
          dispatch({ type: 'app/updateViewLoaded', payload: true });
        });
      });
  }, []);

  function toggleLayer(value) {
    if (viewRef.current) {
      if (value) {
        esriLoader.loadModules(['esri/layers/CSVLayer']).then(([CSVLayer]) => {
          var csvLayer = new CSVLayer({
            url: './school.csv',
          });
          viewRef.current.map.add(csvLayer); // adds the layer to the map
        });
      } else {
        viewRef.current.map.layers.removeAll();
      }
    }
  }

  return (
    <div className={styles.normal}>
      <div ref={domRef} className={styles.viewDiv} />
      <div className={styles.layerList}>
        <LegendLayerList />
      </div>

      <div className={styles.toggle}>
        <Switch
          checked={checked}
          onChange={(value) => {
            setChecked(value);
            toggleLayer(value);
          }}
        />{' '}
        北京市小学分布
      </div>
    </div>
  );
});
