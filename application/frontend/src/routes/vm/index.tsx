import { component$, useClientEffect$, useContext, useStore } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import { ApplicationContext, applicationContext } from '~/ApplicationState';
import { getVirtualMachines, VirtualMachineInformation, checkLogin } from '~/logic';
type Store = {
  vms: VirtualMachineInformation[];
};

export default component$(() => {
  const state = useStore<Store>({ vms: [] });
  const appCtx = useContext<ApplicationContext>(applicationContext);
  useClientEffect$(async () => {
    // if(!(await checkLogin(appCtx)))
    //   return;
    const vms = await getVirtualMachines();
    state.vms = vms;
  });
  return (
    <>
      <p>TEST!</p>

      {state.vms.map((vm) => (
        <div>
          <span>id: {vm.id}</span>
          <span>
            <a href={'/vm/' + vm.name}>name: {vm.name}</a>
          </span>
          <span>state: {vm.state}</span>
        </div>
      ))}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Virtual Machines',
};
