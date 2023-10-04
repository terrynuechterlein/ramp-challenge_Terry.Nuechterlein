import { Fragment, useCallback, useEffect, useMemo} from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  // const [isLoading, setIsLoading] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const loadAllTransactions = useCallback(async () => {
    // setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    // setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  //Bug 5. The root cause of the problem in bug 5 was that the isLoading state within App.tsx was used as the loading property for the InputSelect component. This state was getting set to true during the fetching of both employees AND paginated transaactions (per the comments in the loadAllTransactions function). As a result, until both requests were completed, the bug persists.To solve, I added a dedicated isLoading state in the useEmployee hook to track the loading status of the employees fetch operation, returning the value of the new local isLoading state instead of the previous loading state that was coming from the useCustomFetch hook. I then passed that value as the property for the InputSelect component for employees. This makes the filter by employee dropdown solely responsive to the employee data fetching process.
  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />
        <InputSelect<Employee> 
          isLoading={employeeUtils.loading} 
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })} 

    //Bug 3. The root problem of bug 3 was that there wasn't a condition included in the onChange property of the InputSelect when "All Employees" was selected. The code only checked if the selected value (newValue) was null and then exited early with no further action. To solve, I added a condition to check if the newValue id matched the id of the EMPTY_EMPLOYEE constant which represents the All Employees option, and then calling the loadAllTransactions function when that condition was true.

          onChange={async (newValue) => {
            if (newValue === null || newValue.id === EMPTY_EMPLOYEE.id) {
              await loadAllTransactions()
              return
            }
            await loadTransactionsByEmployee(newValue.id)
          }}
        />

          
        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {/* bug 6 fix. Added conditions to only display the button when transactions are not filted by an employee, and only show the button when there's more data available. */}
          {transactions !== null && transactionsByEmployee === null && paginatedTransactions?.nextPage !== null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}