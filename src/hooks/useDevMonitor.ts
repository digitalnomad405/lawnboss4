import { useEffect, useRef } from 'react';
import { devTools } from '../utils/devTools';

export const useDevMonitor = (componentName: string, props?: Record<string, any>) => {
  const prevPropsRef = useRef(props);

  useEffect(() => {
    // Mount
    devTools.component.mount(componentName);

    // Track initial render time
    devTools.performance.start(`${componentName} initial render`);
    return () => {
      devTools.performance.end(`${componentName} initial render`);
      devTools.component.unmount(componentName);
    };
  }, [componentName]);

  useEffect(() => {
    if (props && prevPropsRef.current !== props) {
      // Find changed props
      const changes: Record<string, { old: any; new: any }> = {};
      Object.keys({ ...prevPropsRef.current, ...props }).forEach((key) => {
        if (prevPropsRef.current?.[key] !== props[key]) {
          changes[key] = {
            old: prevPropsRef.current?.[key],
            new: props[key],
          };
        }
      });

      if (Object.keys(changes).length > 0) {
        devTools.component.update(componentName, changes);
        
        // Track re-render time
        devTools.performance.start(`${componentName} re-render`);
        requestAnimationFrame(() => {
          devTools.performance.end(`${componentName} re-render`);
        });
      }
    }
    prevPropsRef.current = props;
  }, [componentName, props]);
}; 